export interface ChatMessage {
  id?: string;
  userId: string;
  content: string;
  sentDate: Date;
  type: 'user' | 'assistant';
  status?: 'sending' | 'sent' | 'error' | 'temporal';
}

export interface ChatConversation {
  id?: string;
  userId: string;
  messages: ChatMessage[];
  creationDate: Date;
  lastActivity: Date;
  title?: string;
}
