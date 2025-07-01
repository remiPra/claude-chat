//@ts-nocheck
import React, { useState } from 'react';
import { Volume2, Settings, ChevronDown, Zap, Bot } from 'lucide-react';
import { useMultiTTS } from '../../hooks/useMultiTTS';
import type { TTSProvider } from '../../types';
interface TTSSelectorProps {
  ttsState: ReturnType<typeof useMultiTTS>;
}
export const TTSSelector: React.FC<TTSSelectorProps> = ({ ttsState }) => {
  const {
    currentProvider,
    setCurrentProvider,
    voices,
    currentVoice,
    setCurrentVoice,
    geminiVoices,
    geminiVoice,
    setGeminiVoice,
    speed,
    setSpeed,
  } = ttsState;

  const [isOpen, setIsOpen] = useState(false);

  const providers = [
    {
      id: 'kokoro' as TTSProvider,
      name: 'Kokoro',
      icon: Zap,
      color: 'blue',
      description: 'Ultra-rapide • Économique',
    },
    {
      id: 'gemini' as TTSProvider,
      name: 'Gemini',
      icon: Bot,
      color: 'purple',
      description: 'Haute qualité • Google AI',
    },
  ];

  const currentProviderData = providers.find(p => p.id === currentProvider);

  return (
    <div className="relative">
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
          currentProvider === 'gemini'
            ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
            : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
        }`}
      >
        {currentProviderData && (
          <>
            <currentProviderData.icon className="w-4 h-4" />
            <span>{currentProviderData.name} TTS</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </>
        )}
      </button>

      {/* Dropdown/Drawer */}
      {isOpen && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Drawer Panel */}
          <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 z-50 p-4">
            
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Configuration TTS</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>

            {/* Provider Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Service de synthèse vocale
              </label>
              
              <div className="space-y-2">
                {providers.map((provider) => {
                  const Icon = provider.icon;
                  const isSelected = currentProvider === provider.id;
                  
                  return (
                    <button
                      key={provider.id}
                      onClick={() => setCurrentProvider(provider.id)}
                      className={`w-full flex items-start space-x-3 p-3 rounded-lg border-2 transition-all ${
                        isSelected
                          ? provider.color === 'purple'
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className={`p-2 rounded-lg ${
                        isSelected
                          ? provider.color === 'purple'
                            ? 'bg-purple-500 text-white'
                            : 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      
                      <div className="flex-1 text-left">
                        <div className="font-medium text-gray-800">
                          {provider.name}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {provider.description}
                        </div>
                      </div>
                      
                      {isSelected && (
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                          provider.color === 'purple' ? 'bg-purple-500' : 'bg-blue-500'
                        }`}>
                          <div className="w-2 h-2 bg-white rounded-full" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Settings spécifiques au provider */}
            <div className="space-y-4 border-t pt-4">
              
              {/* Kokoro Settings */}
              {currentProvider === 'kokoro' && (
                <>
                  {/* Voice Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Voix Kokoro
                    </label>
                    <select
                      value={currentVoice}
                      onChange={(e) => setCurrentVoice(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {voices.map((voice) => (
                        <option key={voice.id} value={voice.id}>
                          {voice.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Speed Control */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Vitesse de lecture: {speed}x
                    </label>
                    <div className="px-2">
                      <input
                        type="range"
                        min="0.5"
                        max="2.0"
                        step="0.1"
                        value={speed}
                        onChange={(e) => setSpeed(parseFloat(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>0.5x</span>
                        <span>Normal</span>
                        <span>2.0x</span>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Gemini Settings */}
              {currentProvider === 'gemini' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Voix Gemini
                  </label>
                  <select
                    value={geminiVoice}
                    onChange={(e) => setGeminiVoice(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    {geminiVoices.map((voice:any) => (
                      <option key={voice.id} value={voice.id}>
                        {voice.name} ({voice.description})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Footer Info */}
            <div className="border-t pt-4 mt-4">
              <div className="text-xs text-gray-500 text-center">
                {currentProvider === 'gemini' ? (
                  <>🤖 Powered by Google Gemini<br />🎯 Haute qualité • 🌍 24 langues</>
                ) : (
                  <>🚀 Powered by Kokoro TTS<br />⚡ Ultra-rapide • 💰 Économique</>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};