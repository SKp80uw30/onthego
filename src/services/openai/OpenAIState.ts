import { PendingMessage, ConversationMessage } from './types';

export class OpenAIState {
  private initialized: boolean = false;
  private slackAccountId: string | null = null;
  private pendingMessage: PendingMessage | null = null;
  private conversationHistory: ConversationMessage[] = [];
  private instanceId: string;
  private initializationPromise: Promise<void> | null = null;

  constructor() {
    this.instanceId = Math.random().toString(36).substring(7);
    console.log(`[OpenAIState ${this.instanceId}] Created new instance`);
  }

  setInitialized(value: boolean) {
    console.log(`[OpenAIState ${this.instanceId}] Setting initialized:`, value);
    this.initialized = value;
  }

  isInitialized(): boolean {
    return this.initialized && this.slackAccountId !== null;
  }

  setSlackAccountId(id: string | null) {
    console.log(`[OpenAIState ${this.instanceId}] Setting Slack account ID:`, {
      previousId: this.slackAccountId,
      newId: id,
      wasInitialized: this.initialized
    });
    this.slackAccountId = id;
    this.initialized = true;
  }

  getSlackAccountId(): string | null {
    return this.slackAccountId;
  }

  setPendingMessage(message: PendingMessage | null) {
    this.pendingMessage = message;
  }

  getPendingMessage(): PendingMessage | null {
    return this.pendingMessage;
  }

  addToConversationHistory(message: ConversationMessage) {
    this.conversationHistory.push(message);
  }

  getConversationHistory(): ConversationMessage[] {
    return this.conversationHistory;
  }

  setInitializationPromise(promise: Promise<void> | null) {
    this.initializationPromise = promise;
  }

  getInitializationPromise(): Promise<void> | null {
    return this.initializationPromise;
  }

  getInstanceId(): string {
    return this.instanceId;
  }

  reset() {
    console.log(`[OpenAIState ${this.instanceId}] Resetting state`);
    this.initialized = false;
    this.slackAccountId = null;
    this.pendingMessage = null;
    this.conversationHistory = [];
    this.initializationPromise = null;
  }
}