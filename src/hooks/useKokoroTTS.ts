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

  const speak = useCallback(async (text: string) => {
    if (!text.trim()) return;

    setIsGenerating(true);
    setError(null);

    try {
      // Arrêter l'audio en cours
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      const audioBlob = await kokoroService.current.synthesizeSpeech(
        text.substring(0, 800), // Limiter pour éviter les erreurs
        currentVoice, 
        'mp3', 
        speed
      );

      // Créer un nouvel élément audio
      const audioUrl = URL.createObjectURL(audioBlob);
      audioRef.current = new Audio(audioUrl);

      // Événements audio
      audioRef.current.onloadeddata = () => {
        console.log('✅ Audio loaded');
      };

      audioRef.current.onplay = () => {
        setIsPlaying(true);
        console.log('▶️ Playing');
      };

      audioRef.current.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
        console.log('🔚 Ended');
      };

      audioRef.current.onerror = (e) => {
        console.error('❌ Audio error:', e);
        setIsPlaying(false);
        setError('Erreur de lecture');
        URL.revokeObjectURL(audioUrl);
      };

      // Jouer immédiatement
      await audioRef.current.play();

    } catch (err) {
      console.error('❌ TTS Error:', err);
      setError('Erreur TTS');
    } finally {
      setIsGenerating(false);
    }
  }, [currentVoice, speed]);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  }, []);

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