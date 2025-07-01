//@ts-nocheck
import type { ClaudeMessage, ClaudeConfig, Message, Attachment } from '../types';

export class ClaudeAPIService {
  private apiKey: string;
  private baseURL = 'https://api.anthropic.com/v1/messages';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async sendMessage(
    messages: ClaudeMessage[],
    config: ClaudeConfig
  ): Promise<string> {
    if (!this.apiKey) {
      throw new Error('Clé API Claude manquante');
    }

    const response = await fetch(this.baseURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: config.maxTokens,
        system: config.systemPrompt,
        messages,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.error?.message || `Erreur HTTP ${response.status}`
      );
    }

    const data = await response.json();
    
    return data.content[0].text;
  }

  static prepareMessages(messages: Message[]): ClaudeMessage[] {
    return messages.map((msg) => {
      const content: ClaudeContent[] = [];

      if (msg.content.trim()) {
        content.push({
          type: 'text',
          text: msg.content,
        });
      }

      msg.attachments?.forEach((attachment) => {
        if (
          attachment.type === 'image' &&
          attachment.base64 &&
          attachment.mediaType
        ) {
          content.push({
            type: 'image',
            source: {
              type: 'base64',
              media_type: attachment.mediaType,
              data: attachment.base64,
            },
          });
        }
      });

      return {
        role: msg.role,
        content,
      };
    });
  }
}