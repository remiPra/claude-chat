//@ts-nocheck
import React, { useState } from 'react';
import { Volume2, VolumeX, Pause, Play, Square, Settings } from 'lucide-react';
import { useKokoroTTS } from '../../hooks/useKokoroTTS';

interface KokoroTTSControlsProps {
  text: string;
  className?: string;
}

export const KokoroTTSControls: React.FC<KokoroTTSControlsProps> = ({ 
  text, 
  className = '' 
}) => {
  const {
    speak,
    stop,
    pause,
    resume,
    isPlaying,
    isGenerating,
    error,
    voices,
    currentVoice,
    setCurrentVoice,
    speed,
    setSpeed,
  } = useKokoroTTS();

  const [showSettings, setShowSettings] = useState(false);
  const [isLocalPlaying, setIsLocalPlaying] = useState(false);

  const handleToggleSpeak = async () => {
    if (isLocalPlaying || isPlaying) {
      stop();
      setIsLocalPlaying(false);
    } else {
      setIsLocalPlaying(true);
      await speak(text);
      setIsLocalPlaying(false);
    }
  };

  return (
    <div className={`flex items-center space-x-2 relative ${className}`}>
      
      {/* Bouton principal Play/Pause */}
      <button
        onClick={handleToggleSpeak}
        disabled={isGenerating || !text.trim()}
        className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
          isLocalPlaying || isPlaying
            ? 'bg-green-600 hover:bg-green-700' 
            : 'bg-blue-600 hover:bg-blue-700'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
        title={
          isGenerating
            ? 'Génération audio...'
            : (isLocalPlaying || isPlaying)
            ? 'Arrêter' 
            : 'Écouter avec Kokoro TTS'
        }
      >
        {isGenerating ? (
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (isLocalPlaying || isPlaying) ? (
          <Square className="w-4 h-4 text-white fill-current" />
        ) : (
          <Volume2 className="w-4 h-4 text-white" />
        )}
      </button>

      {/* Bouton Settings */}
      <button
        onClick={() => setShowSettings(!showSettings)}
        className="w-8 h-8 rounded-full bg-gray-600 hover:bg-gray-700 flex items-center justify-center transition-colors"
        title="Paramètres TTS"
      >
        <Settings className="w-4 h-4 text-white" />
      </button>

      {/* Panel de settings */}
      {showSettings && (
        <div className="absolute top-10 right-0 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50 min-w-[200px]">
          
          {/* Sélection de voix */}
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Voix
            </label>
            <select
              value={currentVoice}
              onChange={(e) => setCurrentVoice(e.target.value)}
              className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-blue-500"
            >
              {voices.map((voice) => (
                <option key={voice.id} value={voice.id}>
                  {voice.name}
                </option>
              ))}
            </select>
          </div>

          {/* Vitesse */}
          <div className="mb-3">
<label className="block text-sm font-medium text-gray-700 mb-1">
             Vitesse: {speed}x
           </label>
           <input
             type="range"
             min="0.5"
             max="2.0"
             step="0.1"
             value={speed}
             onChange={(e) => setSpeed(parseFloat(e.target.value))}
             className="w-full"
           />
         </div>

         {/* Info */}
         <div className="text-xs text-gray-500 border-t pt-2">
           🚀 Powered by Kokoro TTS
           <br />⚡ Ultra-rapide • 💰 Économique
         </div>
       </div>
     )}

     {/* Indicateur d'état */}
     {(isPlaying || isLocalPlaying) && (
       <div className="flex items-center space-x-1 text-xs text-green-600">
         <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
         <span>Kokoro</span>
       </div>
     )}

     {/* Erreur */}
     {error && (
       <div className="text-xs text-red-500" title={error}>
         ❌
       </div>
     )}
   </div>
 );
};