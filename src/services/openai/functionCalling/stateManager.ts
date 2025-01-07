import { ChatMessage } from './types';

export class ChatStateManager {
  private conversationHistory: ChatMessage[] = [];
  private slackAccountId: string | null = null;

  constructor() {
    this.initializeContext();
  }

  private initializeContext() {
    this.conversationHistory = [{
      role: 'system',
      content: `You are a helpful assistant that can interact with Slack. You can:
      1. Send messages to channels
      2. Fetch recent messages from channels
      3. Check for mentions across channels
      Always confirm before sending messages to Slack.`
    }];
  }

  setSlackAccountId(id: string | null) {
    this.slackAccountId = id;
  }

  getSlackAccountId(): string | null {
    return this.slackAccountId;
  }

  addMessage(message: ChatMessage) {
    this.conversationHistory.push(message);
  }

  getConversationHistory(): ChatMessage[] {
    return this.conversationHistory;
  }

  clearHistory() {
    this.conversationHistory = [];
    this.initializeContext();
  }
}