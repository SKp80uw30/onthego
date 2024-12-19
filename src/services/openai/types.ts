export interface ConversationMessage {
  role: string;
  content: string;
}

export interface PendingMessage {
  content: string;
  channelName: string;
}

export interface ChatResponse {
  response: string;
  action?: string;
  messageContent?: string;
  channelName?: string;
  messageCount?: number;
}