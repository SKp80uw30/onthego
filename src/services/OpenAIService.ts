import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AudioTranscriptionService } from "./AudioTranscriptionService";
import { TextToSpeechService } from "./TextToSpeechService";
import { SlackService } from "./SlackService";

export class OpenAIService {
  private conversationHistory: { role: string; content: string }[] = [];
  private slackAccountId: string | null = null;
  private audioTranscriptionService: AudioTranscriptionService;
  private textToSpeechService: TextToSpeechService;
  private slackService: SlackService;
  private pendingMessage: { content: string; channelName: string } | null = null;
  private initialized: boolean = false;
  private initializationPromise: Promise<void> | null = null;
  private instanceId: string;

  constructor() {
    this.instanceId = Math.random().toString(36).substring(7);
    console.log(`[OpenAIService ${this.instanceId}] Constructor called`);
    this.conversationHistory = [];
    this.audioTranscriptionService = new AudioTranscriptionService();
    this.textToSpeechService = new TextToSpeechService();
    this.slackService = new SlackService();
    console.log(`[OpenAIService ${this.instanceId}] Initial state:`, {
      initialized: this.initialized,
      slackAccountId: this.slackAccountId,
      hasInitPromise: !!this.initializationPromise
    });
  }

  async initialize() {
    console.log(`[OpenAIService ${this.instanceId}] Initialize called. Current state:`, {
      initialized: this.initialized,
      slackAccountId: this.slackAccountId,
      hasInitPromise: !!this.initializationPromise
    });

    if (this.initializationPromise) {
      console.log(`[OpenAIService ${this.instanceId}] Returning existing initialization promise`);
      return this.initializationPromise;
    }

    this.initializationPromise = new Promise<void>(async (resolve) => {
      try {
        console.log(`[OpenAIService ${this.instanceId}] Starting initialization process`);
        
        const { data: { session } } = await supabase.auth.getSession();
        console.log(`[OpenAIService ${this.instanceId}] Session check:`, {
          hasSession: !!session,
          userId: session?.user?.id
        });

        if (!session) {
          console.log(`[OpenAIService ${this.instanceId}] No active session found`);
          this.initialized = false;
          resolve();
          return;
        }

        const { data: settings } = await supabase
          .from('settings')
          .select('default_workspace_id')
          .eq('user_id', session.user.id)
          .maybeSingle();

        console.log(`[OpenAIService ${this.instanceId}] Settings fetch result:`, {
          hasSettings: !!settings,
          workspaceId: settings?.default_workspace_id
        });

        if (settings?.default_workspace_id) {
          this.slackAccountId = settings.default_workspace_id;
          this.initialized = true;
          console.log(`[OpenAIService ${this.instanceId}] Initialized with workspace ID:`, this.slackAccountId);
        } else {
          const { data: workspaces } = await supabase
            .from('slack_accounts')
            .select('id')
            .eq('user_id', session.user.id)
            .limit(1)
            .maybeSingle();

          console.log(`[OpenAIService ${this.instanceId}] Fallback workspace fetch:`, {
            hasWorkspace: !!workspaces,
            workspaceId: workspaces?.id
          });

          if (workspaces?.id) {
            this.slackAccountId = workspaces.id;
            this.initialized = true;
            console.log(`[OpenAIService ${this.instanceId}] Initialized with fallback workspace ID:`, this.slackAccountId);
          } else {
            console.log(`[OpenAIService ${this.instanceId}] No workspace found`);
            this.initialized = false;
          }
        }

        resolve();
      } catch (error) {
        console.error(`[OpenAIService ${this.instanceId}] Initialization error:`, error);
        this.initialized = false;
        resolve();
      }
    });

    return this.initializationPromise;
  }

  setSlackAccountId(id: string | null) {
    console.log(`[OpenAIService ${this.instanceId}] Setting Slack account ID:`, {
      previousId: this.slackAccountId,
      newId: id,
      wasInitialized: this.initialized
    });
    this.slackAccountId = id;
    this.initialized = true;
  }

  getSlackAccountId(): string | null {
    console.log(`[OpenAIService ${this.instanceId}] Getting Slack account ID:`, {
      currentId: this.slackAccountId,
      isInitialized: this.initialized
    });
    return this.slackAccountId;
  }

  isInitialized(): boolean {
    console.log(`[OpenAIService ${this.instanceId}] Checking initialization:`, {
      initialized: this.initialized,
      hasSlackId: !!this.slackAccountId
    });
    return this.initialized && this.slackAccountId !== null;
  }

  async processAudioChunk(audioBlob: Blob) {
    try {
      console.log('OpenAIService: Starting audio chunk processing');
      
      if (!this.initialized) {
        console.error('OpenAI service not initialized');
        toast.error('Service not ready yet. Please try again in a moment.');
        return;
      }

      const currentSlackId = this.getSlackAccountId();
      if (!currentSlackId) {
        console.error('No Slack account selected');
        toast.error('No Slack account selected');
        return;
      }

      console.log('OpenAIService: Using Slack account:', currentSlackId);
      console.log('OpenAIService: Starting transcription...');
      const transcribedText = await this.audioTranscriptionService.transcribeAudio(audioBlob);
      console.log('OpenAIService: Transcription completed:', transcribedText);

      // Check if we have a pending message waiting for confirmation
      if (this.pendingMessage) {
        console.log('OpenAIService: Processing pending message confirmation');
        if (transcribedText.toLowerCase().includes('yes') || transcribedText.toLowerCase().includes('confirm')) {
          console.log('OpenAIService: User confirmed message, sending to Slack...');
          await this.slackService.sendMessage(
            this.pendingMessage.content,
            this.pendingMessage.channelName,
            currentSlackId
          );
          await this.textToSpeechService.speakText('Message sent successfully.');
          this.pendingMessage = null;
          return;
        } else if (transcribedText.toLowerCase().includes('no') || transcribedText.toLowerCase().includes('cancel')) {
          console.log('OpenAIService: User cancelled message send');
          await this.textToSpeechService.speakText('Message cancelled.');
          this.pendingMessage = null;
          return;
        }
      }

      console.log('OpenAIService: Sending to chat-with-ai function...');
      const { data: chatResponse, error: chatError } = await supabase.functions.invoke('chat-with-ai', {
        body: {
          message: transcribedText,
          slackAccountId: currentSlackId,
          conversationHistory: this.conversationHistory,
        },
      });

      if (chatError) {
        console.error('OpenAIService: Error in AI chat:', chatError);
        throw new Error(`Error in AI chat: ${chatError.message}`);
      }

      console.log('OpenAIService: Received chat response:', chatResponse);

      // Update conversation history
      this.conversationHistory.push(
        { role: 'user', content: transcribedText },
        { role: 'assistant', content: chatResponse.response }
      );

      // Speak the AI's response
      console.log('OpenAIService: Speaking AI response...');
      await this.textToSpeechService.speakText(chatResponse.response);

      // Handle AI actions
      if (chatResponse.action === 'SEND_MESSAGE') {
        console.log('OpenAIService: AI suggested sending message:', chatResponse);
        this.pendingMessage = {
          content: chatResponse.messageContent,
          channelName: chatResponse.channelName
        };
        await this.textToSpeechService.speakText(
          `I'll send this message to ${chatResponse.channelName}: "${chatResponse.messageContent}". Would you like to confirm sending this message?`
        );
      } else if (chatResponse.action === 'FETCH_MESSAGES') {
        console.log('OpenAIService: Fetching messages from Slack...');
        const messages = await this.slackService.fetchMessages(
          chatResponse.channelName,
          currentSlackId
        );
        // Add fetched messages to conversation history
        this.conversationHistory.push({
          role: 'system',
          content: `Here are the messages from #${chatResponse.channelName}:\n${messages.join('\n')}`
        });
        // Read the messages to the user
        await this.textToSpeechService.speakText(
          `Here are the recent messages from ${chatResponse.channelName}: ${messages.join('. Next message: ')}`
        );
      }

      console.log('OpenAIService: Audio chunk processing completed');
      return { transcribedText, aiResponse: chatResponse.response };
    } catch (error) {
      console.error('Error in OpenAI service:', error);
      toast.error('Error processing audio');
      throw error;
    }
  }

  cleanup() {
    console.log(`[OpenAIService ${this.instanceId}] Cleaning up. State before cleanup:`, {
      initialized: this.initialized,
      slackAccountId: this.slackAccountId,
      hasInitPromise: !!this.initializationPromise
    });
    this.textToSpeechService.cleanup();
    this.conversationHistory = [];
    this.pendingMessage = null;
    this.slackAccountId = null;
    this.initialized = false;
    this.initializationPromise = null;
    console.log(`[OpenAIService ${this.instanceId}] Cleanup complete`);
  }
}