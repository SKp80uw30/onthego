export interface AIResponse {
  response: string;
  action?: string;
  channelName?: string;
  messageContent?: string;
  messageCount?: number;
  timestamp?: string;
  confirmed?: boolean;
  pendingMessage?: PendingMessageData;
}

export interface ConversationMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface PendingMessageData {
  content: string;
  channelName: string;
  status: 'draft' | 'pending_confirmation' | 'confirmed';
}

export interface CommandResult {
  action: string;
  channelName?: string;
  messageContent?: string;
  messageCount?: number;
  pendingMessage?: PendingMessageData;
}