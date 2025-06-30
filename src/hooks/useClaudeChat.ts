import { useState, useCallback } from 'react';
import { ClaudeAPIService } from '../services/claudeAPI';
import type { Message, ClaudeConfig, Attachment } from '../types';

export const useClaudeChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
  const claudeService = new ClaudeAPIService(apiKey);

  const sendMessage = useCallback(async (
    content: string,
    attachments: Attachment[] = [],
    config: ClaudeConfig
  ) => {
    if (!content.trim() && attachments.length === 0) return;

    setError(null);
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      attachments,
      timestamp: new Date(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      const claudeMessages = ClaudeAPIService.prepareMessages(updatedMessages);
      const response = await claudeService.sendMessage(claudeMessages, config);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMessage);
      
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `❌ Erreur: ${errorMessage}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  }, [messages, claudeService]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
  };
};