export interface ChatMessage {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  sources?: Array<{
    fileId: string;
    filename: string;
    score: number;
  }>;
}

export interface ChatConfig {
  endpoint: string;
  conversationId?: string;
  authToken?: string;
  theme?: {
    accent?: string;
    font?: string;
  };
  onMessage?: (message: ChatMessage) => void;
  onError?: (error: Error) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}
