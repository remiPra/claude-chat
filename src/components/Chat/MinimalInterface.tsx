import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Send, Image, X } from 'lucide-react';
import { useClaudeChat } from '../../hooks/useClaudeChat';

interface Attachment {
  type: 'image' | 'document' | 'audio';
  name: string;
  url: string;
  file?: File;
  base64?: string;
  mediaType?: string;
}

export const MinimalResponsive: React.FC = () => {
  const { messages, isLoading, sendMessage, clearMessages } = useClaudeChat();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [inputText, setInputText] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
  const MAX_RECORDING_TIME = 30;

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Convertir File en base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
    });
  };

  // Gestion des images
  const handleImageUpload = async (files: FileList | File[]) => {
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;
      
      try {
        const base64 = await fileToBase64(file);
        const url = URL.createObjectURL(file);
        
        setAttachments(prev => [...prev, {
          type: 'image',
          name: file.name,
          url,
          file,
          base64,
          mediaType: file.type,
        }]);
      } catch (error) {
        console.error('Erreur image:', error);
      }
    }
  };

  // Supprimer une image
  const removeAttachment = (index: number) => {
    setAttachments(prev => {
      URL.revokeObjectURL(prev[index].url);
      return prev.filter((_, i) => i !== index);
    });
  };

  // Paste d'images
  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (file) {
          const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
          const renamedFile = new File([file], `screenshot_${timestamp}.png`, { type: file.type });
          await handleImageUpload([renamedFile]);
        }
      }
    }
  };

  // Enregistrement audio
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      
      mediaRecorderRef.current = new MediaRecorder(stream);
      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      
      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        await transcribeAudio(audioBlob);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= MAX_RECORDING_TIME - 1) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (error) {
      console.error('Erreur micro:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  // Transcription
  const transcribeAudio = async (audioBlob: Blob) => {
    setIsTranscribing(true);

    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'audio.webm');
      formData.append('model', 'whisper-large-v3');
      formData.append('language', 'fr');

      const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${GROQ_API_KEY}` },
        body: formData,
      });

      const data = await response.json();
      const text = data.text || '';
      
      if (text.trim() || attachments.length > 0) {
        await handleSend(text);
      }
    } catch (error) {
      console.error('Erreur transcription:', error);
    } finally {
      setIsTranscribing(false);
    }
  };

  // Envoi du message
  const handleSend = async (audioText?: string) => {
    const finalText = audioText || inputText;
    
    if (!finalText.trim() && attachments.length === 0) return;

    const config = {
      model: 'claude-sonnet-4-20250514',
      maxTokens: 2000,
      systemPrompt: 'adopt the role taht users want you.',
    };

    let messageText = finalText;
    if (attachments.length > 0 && !finalText.trim()) {
      messageText = 'describe image';
    }

    await sendMessage(messageText, attachments, config);
    
    // Reset
    setInputText('');
    setAttachments([]);
  };

  // Drag & Drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) handleImageUpload(files);
  };

  const isBusy = isRecording || isTranscribing || isLoading;

  return (
    <div 
      className="min-h-screen bg-slate-50 flex flex-col"
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      onPaste={handlePaste}
      tabIndex={0}
    >
      {/* Overlay drag & drop simple */}
      {isDragOver && (
        <div className="fixed inset-0 bg-blue-100 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
            <p className="text-gray-700">📸 Déposez votre image</p>
          </div>
        </div>
      )}

      {/* Header minimaliste */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <h1 className="text-xl font-light text-gray-700">Assistant Podologique</h1>
          <button
            onClick={clearMessages}
            className="text-gray-500 hover:text-gray-700 text-sm"
          >
            Nouveau
          </button>
        </div>
      </div>

      {/* Zone Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-4">
          
          {/* État initial */}
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
              <div className="mb-8">
                <h2 className="text-2xl font-light text-gray-600 mb-4">
                  Bonjour
                </h2>
                <p className="text-gray-500 text-sm">
                  Parlez, écrivez ou envoyez une image
                </p>
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.map((message) => (
            <div
              key={message.id}
              className={`mb-6 flex ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-md lg:max-w-lg p-4 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-gray-100 text-gray-800'
                    : 'bg-white border border-gray-200 text-gray-800'
                }`}
              >
                {/* Images */}
                {message.attachments?.map((attachment, i) => (
                  <div key={i} className="mb-3">
                    <img
                      src={attachment.url}
                      alt={attachment.name}
                      className="w-full rounded border border-gray-200"
                    />
                  </div>
                ))}
                
                {/* Texte */}
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {message.content}
                </div>
                
                {/* Time */}
                <div className="text-xs text-gray-400 mt-2">
                  {message.timestamp.toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            </div>
          ))}

          {/* Loading */}
          {isLoading && (
            <div className="flex justify-start mb-6">
              <div className="bg-white border border-gray-200 p-4 rounded-lg">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce delay-100"></div>
                  <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce delay-200"></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Zone contrôle en bas - selon votre design */}
      <div className="bottom-0 left-0 w-full fixed bg-white border-t border-gray-200 p-6">
        <div className="max-w-4xl mx-auto">
          
          {/* Preview des images (coin) */}
          {attachments.length > 0 && (
            <div className="flex justify-end mb-4">
              <div className="flex space-x-2">
                {attachments.map((attachment, index) => (
                  <div key={index} className="relative">
                    <img
                      src={attachment.url}
                      alt={attachment.name}
                      className="w-16 h-16 object-cover rounded border border-gray-300"
                    />
                    <button
                      onClick={() => removeAttachment(index)}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-gray-600 text-white rounded-full flex items-center justify-center text-xs"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Contrôles principaux - disposition selon votre schéma */}
          <div className="flex flex-col items-center space-y-6">
            
            {/* Ligne des 3 boutons */}
            <div className="flex items-center justify-center space-x-8">
              
              {/* Bouton Image (gauche) */}
              <button
                onClick={() => imageInputRef.current?.click()}
                disabled={isBusy}
                className="w-16 h-16 bg-white border border-gray-300 rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
              >
                <Image className="w-6 h-6 text-gray-600" />
              </button>

              {/* Bouton Micro (centre - plus grand) */}
              <button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isTranscribing}
                className={`w-20 h-20 rounded-full flex items-center justify-center transition-colors shadow-lg disabled:opacity-50 ${
                  isRecording 
                    ? 'bg-red-500 hover:bg-red-600' 
                    : 'bg-gray-800 hover:bg-gray-900'
                }`}
              >
                {isTranscribing ? (
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : isRecording ? (
                  <Square className="w-7 h-7 text-white fill-current" />
                ) : (
                  <Mic className="w-7 h-7 text-white" />
                )}
              </button>

              {/* Bouton Send (droite) */}
              <button
                onClick={() => handleSend()}
                disabled={(!inputText.trim() && attachments.length === 0) || isBusy}
                className="w-16 h-16 bg-white border border-gray-300 rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
              >
                <Send className="w-6 h-6 text-gray-600" />
              </button>
            </div>

            {/* Timer si enregistrement */}
            {isRecording && (
              <div className="text-center">
                <div className="text-red-500 text-sm font-mono">
                  {recordingTime}s / {MAX_RECORDING_TIME}s
                </div>
              </div>
            )}

            {/* Barre de texte (ellipse selon votre schéma) */}
            <div className="w-full max-w-lg">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !isBusy) {
                    handleSend();
                  }
                }}
                placeholder="Tapez votre question..."
                className="w-full px-6 py-3 rounded-full border border-gray-300 focus:outline-none focus:border-gray-400 text-center text-gray-700 placeholder-gray-400"
                disabled={isBusy}
              />
            </div>

            {/* Status minimal */}
            {/* {(isRecording || isTranscribing || isLoading) && (
              <div className="text-center">
                <p className="text-gray-500 text-xs">
                  {isRecording ? '🔴 Enregistrement...' : 
                   isTranscribing ? '🧠 Transcription...' : 
                   isLoading ? '🤖 Analyse...' : ''}
                </p>
              </div>
            )} */}
          </div>
        </div>

        {/* Input file caché */}
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => e.target.files && handleImageUpload(e.target.files)}
          className="hidden"
        />
      </div>
    </div>
  );
};