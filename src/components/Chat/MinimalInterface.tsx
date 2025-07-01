//@ts-nocheck
import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Send, Image, X, Volume2, VolumeX } from 'lucide-react';
import { useClaudeChat } from '../../hooks/useClaudeChat';
import { useKokoroTTS } from '../../hooks/useKokoroTTS';
import { KokoroTTSControls } from './KokoroTTSControls';
import { TTSSelector } from './TTSSelector';
import { GeminiTTSService } from '../../services/geminiTTS';
import { useTTS } from '../../contexts/TTSContext';


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
//  const { speak, stop, isPlaying, isGenerating } = useKokoroTTS();
const ttsState = useTTS();
console.log('🔍 Current TTS Provider:', ttsState.currentProvider);  // ← AJOUTE CETTE LIGNE
console.log('🔍 Available providers:', ttsState);                    // ← AJOUTE CETTE LIGNE
 const { speak, stop, isPlaying, isGenerating } = ttsState;

 // État pour contrôler l'auto-play TTS
 const [autoTTSEnabled, setAutoTTSEnabled] = useState(true);
 
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

 // Auto-scroll vers le bas quand de nouveaux messages arrivent
 useEffect(() => {
   messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
 }, [messages]);

 // Auto-play TTS quand une nouvelle réponse de l'assistant arrive
 useEffect(() => {
   if (messages.length > 0 && autoTTSEnabled) {
     const lastMessage = messages[messages.length - 1];
     
     // Si c'est une réponse de l'assistant et qu'elle n'est pas vide
     if (lastMessage.role === 'assistant' && lastMessage.content.trim()) {
       // Arrêter tout TTS en cours et lancer le nouveau
       stop();
       setTimeout(() => {
         speak(lastMessage.content);
       }, 500);
     }
   }
 }, [messages, autoTTSEnabled, speak, stop]);

 // Convertir File en base64 pour l'envoi à Claude
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

 // Gestion de l'upload d'images
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
       console.error('Erreur lors du traitement de l\'image:', error);
     }
   }
 };

 // Supprimer une image des attachments
 const removeAttachment = (index: number) => {
   setAttachments(prev => {
     URL.revokeObjectURL(prev[index].url);
     return prev.filter((_, i) => i !== index);
   });
 };
// Ajoute ça temporairement pour tester

const testRealGemini = async () => {
  try {
    const geminiService = new GeminiTTSService(import.meta.env.VITE_GEMINI_API_KEY);
    const audioBlob = await geminiService.synthesizeSpeech("Hello test", "Puck");
    
    console.log('🔍 Blob créé:', audioBlob.size, 'bytes, type:', audioBlob.type);
    
    // 🟢 TEST 1: Essayer avec plusieurs méthodes
    const audioUrl = URL.createObjectURL(audioBlob);
    console.log('🔗 Audio URL créée:', audioUrl);
    
    // Méthode 1: Audio() avec gestion d'erreur détaillée
    const audio = new Audio();
    
    audio.onloadeddata = () => {
      console.log('✅ Audio chargé avec succès');
      audio.play().catch(e => console.error('❌ Erreur play:', e));
    };
    
    audio.onerror = (e) => {
      console.error('❌ Erreur audio détaillée:', e);
      console.error('❌ Audio error code:', audio.error?.code);
      console.error('❌ Audio error message:', audio.error?.message);
      
      // 🟢 TEST 2: Essayer avec un autre type MIME
      const newBlob = new Blob([audioBlob], { type: 'audio/mpeg' });
      const newUrl = URL.createObjectURL(newBlob);
      console.log('🔄 Essai avec audio/mpeg:', newUrl);
      
      const audio2 = new Audio(newUrl);
      audio2.play().catch(e2 => {
        console.error('❌ Échec audio/mpeg aussi:', e2);
        
        // 🟢 TEST 3: Essayer avec audio/ogg
        const oggBlob = new Blob([audioBlob], { type: 'audio/ogg' });
        const oggUrl = URL.createObjectURL(oggBlob);
        const audio3 = new Audio(oggUrl);
        audio3.play().catch(e3 => {
          console.error('❌ Tous les formats ont échoué');
        });
      });
    };
    
    audio.src = audioUrl;
    audio.load(); // Force le chargement
    
  } catch (error) {
    console.error('❌ Test Gemini TTS échoué:', error);
  }
};
 // Gestion du paste d'images (Ctrl+V)
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

 // Démarrer l'enregistrement audio// Démarrer l'enregistrement audio
const startRecording = async () => {
  try {
    // 🟢 NOUVEAU : Arrêter le TTS avant de commencer l'enregistrement
    if (isPlaying || isGenerating) {
      stop(); // Arrête le TTS en cours
    }

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
    
    // Timer pour l'enregistrement
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
    console.error('Erreur lors de l\'accès au microphone:', error);
    alert('Impossible d\'accéder au microphone. Vérifiez vos permissions.');
  }
};

 // Arrêter l'enregistrement audio
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

 // Transcription audio avec Groq Whisper
 const transcribeAudio = async (audioBlob: Blob) => {
   setIsTranscribing(true);

   try {
     const formData = new FormData();
     formData.append('file', audioBlob, 'audio.webm');
     formData.append('model', 'whisper-large-v3');
formData.append('language', 'en'); // Changé de 'fr' à 'en'
     const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
       method: 'POST',
       headers: { 'Authorization': `Bearer ${GROQ_API_KEY}` },
       body: formData,
     });

     if (!response.ok) {
       throw new Error(`Erreur transcription: ${response.status}`);
     }

     const data = await response.json();
     const text = data.text || '';
     
     if (text.trim() || attachments.length > 0) {
       await handleSend(text);
     }
   } catch (error) {
     console.error('Erreur lors de la transcription:', error);
     alert('Erreur lors de la transcription audio');
   } finally {
     setIsTranscribing(false);
   }
 };

 // Envoi du message à Claude
 const handleSend = async (audioText?: string) => {
   const finalText = audioText || inputText;
   
   if (!finalText.trim() && attachments.length === 0) return;

   const config = {
     model: 'claude-sonnet-4-20250514',
     maxTokens: 800,
systemPrompt: `Hey! You're a helpful, down-to-earth assistant. Talk like you're chatting with a friend who needs help.

Your vibe:
- Speak normally, no robot-speak
- Be warm but not overly casual  
- When you write **bold** or *italic* text, NEVER say "asterisk" - just use the symbols
- Skip the "As an AI assistant" stuff
- Be direct, helpful, and keep it flowing
- Sound human, not like a manual

Just be yourself - natural, friendly, and genuinely helpful!`,   };

   let messageText = finalText;
   if (attachments.length > 0 && !finalText.trim()) {
     messageText = 'Describe this image';
   }

   await sendMessage(messageText, attachments, config);
   
   // Reset des champs après envoi
   setInputText('');
   setAttachments([]);
 };

 // Gestion du drag & drop d'images
 const handleDrop = (e: React.DragEvent) => {
   e.preventDefault();
   setIsDragOver(false);
   const files = e.dataTransfer.files;
   if (files.length > 0) handleImageUpload(files);
 };

 const handleDragOver = (e: React.DragEvent) => {
   e.preventDefault();
   setIsDragOver(true);
 };

 const handleDragLeave = () => {
   setIsDragOver(false);
 };

 const isBusy = isRecording || isTranscribing || isLoading;

 return (
   <div 
     className="min-h-screen bg-slate-50 flex flex-col"
     onDragOver={handleDragOver}
     onDragLeave={handleDragLeave}
     onDrop={handleDrop}
     onPaste={handlePaste}
     tabIndex={0}
   >
     {/* Overlay pour le drag & drop */}
     {isDragOver && (
       <div className="fixed inset-0 bg-blue-100 bg-opacity-50 flex items-center justify-center z-50">
         <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
           <p className="text-gray-700 text-lg">📸 Déposez votre image ici</p>
         </div>
       </div>
     )}


  {/* Header avec contrôles TTS */}
<div className="bg-white border-b border-gray-200 px-4 py-3">
  <div className="flex items-center justify-between max-w-4xl mx-auto">
    <h1 className="text-xl font-light text-gray-700">Assistant Podologique</h1>
    
    <div className="flex items-center space-x-4">
      {/* Toggle Auto-TTS */}
      <button
        onClick={() => setAutoTTSEnabled(!autoTTSEnabled)}
        className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm transition-colors ${
          autoTTSEnabled 
            ? 'bg-green-100 text-green-700 hover:bg-green-200' 
            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
        }`}
        title={autoTTSEnabled ? 'Désactiver auto-TTS' : 'Activer auto-TTS'}
      >
        {autoTTSEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        
        <span>Auto</span>
      </button>
      
      {/* Nouveau selector TTS */}
<TTSSelector ttsState={ttsState} />
      
      {/* Bouton Stop TTS si en cours */}
      {(isPlaying || isGenerating) && (
        <button
          onClick={stop}
          className="flex items-center space-x-1 px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm hover:bg-red-200 transition-colors"
          title="Arrêter la lecture"
        >
          <Square className="w-4 h-4" />
          <span>Stop</span>
        </button>
      )}
      
      {/* Bouton Nouveau */}
      <button
        onClick={() => {
          clearMessages();
          stop();
        }}
        className="text-gray-500 hover:text-gray-700 text-sm transition-colors"
      >
        Nouveau
      </button>
    </div>
  </div>
</div>

     {/* Zone des messages */}
     <div className="flex-1 overflow-y-auto">
       <div className="max-w-4xl mx-auto p-4">
         
         {/* État initial quand aucun message */}
         {messages.length === 0 && (
           <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
             <div className="mb-8">
               <h2 className="text-2xl font-light text-gray-600 mb-4">
                 Bonjour 👋
               </h2>
               <p className="text-gray-500 text-sm mb-2">
                 Parlez, écrivez ou envoyez une image
               </p>
               {autoTTSEnabled && (
                 <p className="text-blue-500 text-xs mt-2 flex items-center justify-center space-x-1">
                   <Volume2 className="w-3 h-3" />
                   <span>TTS automatique activé</span>
                 </p>
               )}
             </div>
           </div>
         )}

         {/* Affichage des messages */}
         {messages.map((message, index) => (
           <div
             key={message.id}
             className={`mb-6 flex ${
               message.role === 'user' ? 'justify-end' : 'justify-start'
             }`}
           >
             <div
               className={`max-w-md lg:max-w-lg p-4 rounded-lg relative ${
                 message.role === 'user'
                   ? 'bg-gray-100 text-gray-800'
                   : 'bg-white border border-gray-200 text-gray-800'
               }`}
             >
               {/* Indicateur TTS pour la dernière réponse */}
               {message.role === 'assistant' && 
                index === messages.length - 1 && 
                (isPlaying || isGenerating) && (
                 <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                   {isGenerating ? (
                     <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                   ) : (
                     <Volume2 className="w-3 h-3 text-white" />
                   )}
                 </div>
               )}
               
               {/* Affichage des images */}
               {message.attachments?.map((attachment, i) => (
                 <div key={i} className="mb-3">
                   <img
                     src={attachment.url}
                     alt={attachment.name}
                     className="w-full rounded border border-gray-200 max-w-sm"
                   />
                 </div>
               ))}
               
               {/* Contenu du message */}
               <div className="whitespace-pre-wrap text-sm leading-relaxed">
                 {message.content}
               </div>
               
               {/* Footer du message avec timestamp et contrôles TTS */}
               <div className="flex items-center justify-between mt-3">
                 <div className="text-xs text-gray-400">
                   {message.timestamp.toLocaleTimeString('fr-FR', {
                     hour: '2-digit',
                     minute: '2-digit'
                   })}
                 </div>
                 
                 {/* Contrôles TTS manuels pour les réponses */}
                 {message.role === 'assistant' && (
                   <div className="relative">
                     <KokoroTTSControls 
                       text={message.content} 
                       className="scale-75 origin-right"
                     />
                   </div>
                 )}
               </div>
             </div>
           </div>
         ))}

         {/* Indicateur de chargement */}
         {isLoading && (
           <div className="flex justify-start mb-6">
             <div className="bg-white border border-gray-200 p-4 rounded-lg">
               <div className="flex space-x-1">
                 <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce"></div>
                 <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce delay-100"></div>
                 <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce delay-200"></div>
               </div>
               <div className="text-xs text-gray-500 mt-2">Claude réfléchit...</div>
             </div>
           </div>
         )}

         {/* Référence pour l'auto-scroll */}
         <div ref={messagesEndRef} />
       </div>
     </div>

     {/* Zone de contrôle fixée en bas */}
     <div className="bg-white border-t border-gray-200 p-6">
       <div className="max-w-4xl mx-auto">
         
         {/* Preview des images attachées */}
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
                     className="absolute -top-1 -right-1 w-5 h-5 bg-gray-600 text-white rounded-full flex items-center justify-center text-xs hover:bg-gray-700 transition-colors"
                   >
                     <X className="w-3 h-3" />
                   </button>
                 </div>
               ))}
             </div>
           </div>
         )}

         {/* Contrôles principaux */}
         <div className="flex flex-col items-center space-y-6">
           
           {/* Ligne des 3 boutons principaux */}
           <div className="flex items-center justify-center space-x-8">
             
             {/* Bouton Image (gauche) */}
             <button
               onClick={() => imageInputRef.current?.click()}
               disabled={isBusy}
               className="w-16 h-16 bg-white border border-gray-300 rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
               title="Ajouter une image"
             >
               <Image className="w-6 h-6 text-gray-600" />
             </button>

             {/* Bouton Micro (centre - plus grand) */}
             <button
               onClick={isRecording ? stopRecording : startRecording}
               disabled={isTranscribing}
               className={`w-20 h-20 rounded-full flex items-center justify-center transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                 isRecording 
                   ? 'bg-red-500 hover:bg-red-600' 
                   : 'bg-gray-800 hover:bg-gray-900'
               }`}
               title={
                 isTranscribing
                   ? 'Transcription en cours...'
                   : isRecording 
                   ? 'Arrêter l\'enregistrement' 
                   : 'Commencer l\'enregistrement vocal'
               }
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
               className="w-16 h-16 bg-white border border-gray-300 rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
               title="Envoyer le message"
             >
               <Send className="w-6 h-6 text-gray-600" />
             </button>
           </div>

           {/* Timer d'enregistrement */}
           {isRecording && (
             <div className="text-center">
               <div className="text-red-500 text-sm font-mono">
                 🔴 {recordingTime}s / {MAX_RECORDING_TIME}s
               </div>
               <div className="text-xs text-gray-500 mt-1">
                 Cliquez sur le bouton pour arrêter
               </div>
             </div>
           )}

           {/* Barre de saisie de texte */}
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
               className="w-full px-6 py-3 rounded-full border border-gray-300 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 text-center text-gray-700 placeholder-gray-400 transition-all"
               disabled={isBusy}
             />
           </div>

           {/* Indicateurs de statut */}
           {(isGenerating || isPlaying) && (
             <div className="text-center">
               <p className="text-blue-500 text-xs flex items-center justify-center space-x-1">
                 <Volume2 className="w-3 h-3" />
                 <span>
                   {isGenerating ? 'Génération audio...' : 'Lecture en cours...'}
                 </span>
               </p>
             </div>
           )}

           {/* Status de transcription */}
           {isTranscribing && (
             <div className="text-center">
               <p className="text-orange-500 text-xs flex items-center justify-center space-x-1">
                 <div className="w-3 h-3 border border-orange-500 border-t-transparent rounded-full animate-spin" />
                 <span>Transcription en cours...</span>
               </p>
             </div>
           )}
         </div>
       </div>

       {/* Input file caché pour les images */}
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