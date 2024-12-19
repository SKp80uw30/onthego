export interface AIResponse {
  response: string;
  action?: string;
  channelName?: string;
  messageContent?: string;
  messageCount?: number;
  timestamp?: string;
  confirmed?: boolean;
}

export interface SlackCommand {
  action: 'FETCH_MESSAGES' | 'FETCH_MENTIONS' | 'SEND_MESSAGE';
  channelName: string;
  messageContent?: string;
  messageCount?: number;
  timestamp?: string;
  confirmed?: boolean;
}

export interface ConversationMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}