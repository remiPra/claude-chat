export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  attachments?: Attachment[];
  timestamp: Date;
}

export interface Attachment {
  type: 'image' | 'document' | 'audio';
  name: string;
  url: string;
  file?: File;
  base64?: string;
  mediaType?: string;
}

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: ClaudeContent[];
}

export interface ClaudeContent {
  type: 'text' | 'image';
  text?: string;
  source?: {
    type: 'base64';
    media_type: string;
    data: string;
  };
}

export interface ClaudeConfig {
  model: string;
  maxTokens: number;
  systemPrompt?: string;
}