import React, { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { useMultiTTS } from '../hooks/useMultiTTS';

// Type pour le contexte
type TTSContextType = ReturnType<typeof useMultiTTS>;

// Créer le contexte
const TTSContext = createContext<TTSContextType | undefined>(undefined);

// Provider component
export const TTSProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const ttsState = useMultiTTS();
  
  return (
    <TTSContext.Provider value={ttsState}>
      {children}
    </TTSContext.Provider>
  );
};

// Hook pour utiliser le contexte
export const useTTS = () => {
  const context = useContext(TTSContext);
  if (context === undefined) {
    throw new Error('useTTS must be used within a TTSProvider');
  }
  return context;
};