import { useState, useRef, useCallback } from 'react';
import { KokoroTTSService, KOKORO_VOICES } from '../services/kokoroTTS';

export const useKokoroTTS = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentVoice, setCurrentVoice] = useState('af_bella');
  const [speed, setSpeed] = useState(1.0);
  const [error, setError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const kokoroService = useRef(new KokoroTTSService(import.meta.env.VITE_DEEPINFRA_API_KEY));
  
  // 🆕 Nouveaux refs pour le streaming
  const audioQueue = useRef<Blob[]>([]);
  const isStreamingRef = useRef(false);
  const shouldStopRef = useRef(false);
  const currentAudioIndex = useRef(0);

  // 🆕 Fonction pour diviser en phrases
  const splitIntoSentences = (text: string): string[] => {
    // Divise sur . ! ? mais garde les phrases courtes ensemble si nécessaire
    return text
      .split(/([.!?]+\s)/)
      .filter(s => s.trim().length > 0)
      .reduce((acc: string[], curr, index, arr) => {
        if (index % 2 === 0) {
          // Phrase principale
          const sentence = curr + (arr[index + 1] || '');
          if (sentence.trim().length > 5) {
            acc.push(sentence.trim());
          }
        }
        return acc;
      }, []);
  };

  // 🆕 Fonction pour jouer la queue audio
  const playNextInQueue = useCallback(async () => {
    if (shouldStopRef.current || audioQueue.current.length === 0) {
      setIsPlaying(false);
      setIsGenerating(false);
      isStreamingRef.current = false;
      return;
    }

    const nextBlob = audioQueue.current.shift();
    if (!nextBlob) {
      setIsPlaying(false);
      setIsGenerating(false);
      isStreamingRef.current = false;
      return;
    }

    try {
      // Arrêter l'audio précédent
      if (audioRef.current) {
        audioRef.current.pause();
        URL.revokeObjectURL(audioRef.current.src);
      }

      const audioUrl = URL.createObjectURL(nextBlob);
      audioRef.current = new Audio(audioUrl);

      audioRef.current.onended = () => {
        URL.revokeObjectURL(audioUrl);
        playNextInQueue(); // Jouer le suivant
      };

      audioRef.current.onerror = (e) => {
        console.error('❌ Audio error:', e);
        URL.revokeObjectURL(audioUrl);
        playNextInQueue(); // Continuer malgré l'erreur
      };

      await audioRef.current.play();
      setIsPlaying(true);

    } catch (error) {
      console.error('❌ Erreur lecture:', error);
      playNextInQueue(); // Continuer
    }
  }, []);

  // 🆕 Fonction principale de streaming TTS
  const speakStreaming = useCallback(async (text: string) => {
    if (!text.trim()) return;

    // Reset du système
    shouldStopRef.current = false;
    audioQueue.current = [];
    currentAudioIndex.current = 0;
    isStreamingRef.current = true;
    setIsGenerating(true);
    setError(null);

    // Arrêter tout audio en cours
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    try {
      const sentences = splitIntoSentences(text);
      console.log(`🎵 Streaming TTS: ${sentences.length} phrases à traiter`);

      // Générer et jouer en parallèle
      let isFirstSentence = true;

      for (let i = 0; i < sentences.length; i++) {
        if (shouldStopRef.current) break;

        const sentence = sentences[i];
        if (!sentence.trim()) continue;

        try {
          console.log(`🎵 Génération phrase ${i + 1}:`, sentence.substring(0, 50));
          
          const audioBlob = await kokoroService.current.synthesizeSpeech(
            sentence,
            currentVoice, 
            'mp3', 
            speed
          );

          if (shouldStopRef.current) break;

          audioQueue.current.push(audioBlob);

          // Démarrer la lecture dès la première phrase prête
          if (isFirstSentence) {
            isFirstSentence = false;
            setIsGenerating(false); // On a au moins une phrase prête
            playNextInQueue();
          }

        } catch (error) {
          console.error(`❌ Erreur phrase ${i + 1}:`, error);
          // Continuer avec les autres phrases
        }

        // Petite pause pour éviter de spam l'API
        if (i < sentences.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

    } catch (error) {
      console.error('❌ Erreur streaming TTS:', error);
      setError('Erreur TTS streaming');
      setIsGenerating(false);
      setIsPlaying(false);
      isStreamingRef.current = false;
    }
  }, [currentVoice, speed, playNextInQueue]);

  // 🆕 Fonction stop améliorée
  const stop = useCallback(() => {
    console.log('🛑 Stop TTS streaming');
    
    // Arrêter tout le processus
    shouldStopRef.current = true;
    isStreamingRef.current = false;
    
    // Vider la queue
    audioQueue.current = [];
    
    // Arrêter l'audio actuel
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      URL.revokeObjectURL(audioRef.current.src);
    }
    
    setIsPlaying(false);
    setIsGenerating(false);
  }, []);

  // Fonction speak normale (garde l'ancienne pour compatibilité)
  const speak = useCallback(async (text: string) => {
    return speakStreaming(text);
  }, [speakStreaming]);

  const pause = useCallback(() => {
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  const resume = useCallback(() => {
    if (audioRef.current && audioRef.current.paused) {
      audioRef.current.play();
      setIsPlaying(true);
    }
  }, []);

  return {
    speak,
    speakStreaming, // 🆕 Exposer la fonction streaming
    stop,
    pause,
    resume,
    isPlaying,
    isGenerating,
    error,
    voices: KOKORO_VOICES,
    currentVoice,
    setCurrentVoice,
    speed,
    setSpeed,
  };
};