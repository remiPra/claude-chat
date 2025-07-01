import { useState, useRef, useCallback } from 'react';
import { KokoroTTSService, KOKORO_VOICES } from '../services/kokoroTTS';
import { GeminiTTSService, GEMINI_VOICES } from '../services/geminiTTS';
import type { TTSProvider } from '../types';

export const useMultiTTS = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentProvider, setCurrentProvider] = useState<TTSProvider>('kokoro');
  const [currentVoice, setCurrentVoice] = useState('af_bella'); // Kokoro voice
  const [geminiVoice, setGeminiVoice] = useState('Kore'); // Gemini voice
  const [speed, setSpeed] = useState(1.0);
  const [error, setError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const kokoroService = useRef(new KokoroTTSService(import.meta.env.VITE_DEEPINFRA_API_KEY));
  const geminiService = useRef(new GeminiTTSService(import.meta.env.VITE_GEMINI_API_KEY));

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

      let audioBlob: Blob;

      // Choisir le service selon le provider
      if (currentProvider === 'gemini') {
        audioBlob = await geminiService.current.synthesizeSpeech(
          text.substring(0, 1000), // Gemini peut gérer plus de texte
          geminiVoice
        );
      } else {
        // Kokoro
        audioBlob = await kokoroService.current.synthesizeSpeech(
          text.substring(0, 800),
          currentVoice,
          'mp3',
          speed
        );
      }

      // Créer un nouvel élément audio
      const audioUrl = URL.createObjectURL(audioBlob);
      audioRef.current = new Audio(audioUrl);

      // Événements audio
      audioRef.current.onloadeddata = () => {
        console.log(`✅ Audio loaded (${currentProvider})`);
      };

      audioRef.current.onplay = () => {
        setIsPlaying(true);
        console.log(`▶️ Playing (${currentProvider})`);
      };

      audioRef.current.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
        console.log(`🔚 Ended (${currentProvider})`);
      };

      audioRef.current.onerror = (e) => {
        console.error(`❌ Audio error (${currentProvider}):`, e);
        setIsPlaying(false);
        setError('Erreur de lecture');
        URL.revokeObjectURL(audioUrl);
      };

      // Jouer immédiatement
      await audioRef.current.play();

    } catch (err) {
      console.error(`❌ TTS Error (${currentProvider}):`, err);
      setError(`Erreur TTS ${currentProvider}`);
    } finally {
      setIsGenerating(false);
    }
  }, [currentProvider, currentVoice, geminiVoice, speed]);

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
    // Propriétés du provider
    currentProvider,
    setCurrentProvider,
    // Propriétés Kokoro
    voices: KOKORO_VOICES,
    currentVoice,
    setCurrentVoice,
    // Propriétés Gemini
    geminiVoices: GEMINI_VOICES,
    geminiVoice,
    setGeminiVoice,
    // Autres
    speed,
    setSpeed,
  };
};