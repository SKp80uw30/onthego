import { PendingMessage, ConversationMessage } from './types';
import { supabase } from '@/integrations/supabase/client';

export class OpenAIState {
  private initialized: boolean = false;
  private slackAccountId: string | null = null;
  private pendingMessage: PendingMessage | null = null;
  private sessionId: string | null = null;
  private instanceId: string;
  private initializationPromise: Promise<void> | null = null;

  constructor() {
    this.instanceId = Math.random().toString(36).substring(7);
    console.log(`[OpenAIState ${this.instanceId}] Created new instance`);
  }

  async initializeSession() {
    if (!this.slackAccountId) {
      console.error('Cannot initialize session without slackAccountId');
      return;
    }

    try {
      // Check for existing active session
      const { data: existingSession, error: sessionError } = await supabase
        .from('conversation_sessions')
        .select('id')
        .eq('slack_account_id', this.slackAccountId)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();

      if (sessionError) throw sessionError;

      if (existingSession?.id) {
        this.sessionId = existingSession.id;
        console.log(`[OpenAIState ${this.instanceId}] Using existing session:`, this.sessionId);
        return;
      }

      // Create a new conversation session
      const { data: session, error } = await supabase
        .from('conversation_sessions')
        .insert([{ 
          slack_account_id: this.slackAccountId,
          status: 'active'
        }])
        .select()
        .single();

      if (error) throw error;
      
      this.sessionId = session.id;
      console.log(`[OpenAIState ${this.instanceId}] Initialized session:`, this.sessionId);
    } catch (error) {
      console.error('Error initializing conversation session:', error);
      throw error;
    }
  }

  setInitialized(value: boolean) {
    console.log(`[OpenAIState ${this.instanceId}] Setting initialized:`, value);
    this.initialized = value;
  }

  isInitialized(): boolean {
    return this.initialized && this.slackAccountId !== null;
  }

  async setSlackAccountId(id: string | null) {
    console.log(`[OpenAIState ${this.instanceId}] Setting Slack account ID:`, {
      previousId: this.slackAccountId,
      newId: id,
      wasInitialized: this.initialized
    });
    this.slackAccountId = id;
    this.initialized = true;

    if (id) {
      await this.initializeSession();
    }
  }

  getSlackAccountId(): string | null {
    return this.slackAccountId;
  }

  async addToConversationHistory(message: ConversationMessage) {
    if (!this.sessionId) {
      console.error('No active session');
      return;
    }

    try {
      const { error } = await supabase
        .from('conversation_messages')
        .insert([{
          session_id: this.sessionId,
          role: message.role,
          content: message.content,
          metadata: {}
        }]);

      if (error) throw error;
    } catch (error) {
      console.error('Error adding message to conversation history:', error);
      throw error;
    }
  }

  async getConversationHistory(): Promise<ConversationMessage[]> {
    if (!this.sessionId) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('conversation_messages')
        .select('*')
        .eq('session_id', this.sessionId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return data.map(msg => ({
        role: msg.role,
        content: msg.content
      }));
    } catch (error) {
      console.error('Error fetching conversation history:', error);
      return [];
    }
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

  async reset() {
    console.log(`[OpenAIState ${this.instanceId}] Resetting state`);
    
    if (this.sessionId) {
      try {
        // Mark the session as completed
        const { error } = await supabase
          .from('conversation_sessions')
          .update({ 
            status: 'completed',
            last_active: new Date().toISOString()
          })
          .eq('id', this.sessionId);

        if (error) throw error;
      } catch (error) {
        console.error('Error completing conversation session:', error);
      }
    }

    this.initialized = false;
    this.slackAccountId = null;
    this.pendingMessage = null;
    this.sessionId = null;
    this.initializationPromise = null;
  }
}
