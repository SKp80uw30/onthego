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

  constructor() {
    console.log('Initializing OpenAIService...');
    this.conversationHistory = [];
    this.audioTranscriptionService = new AudioTranscriptionService();
    this.textToSpeechService = new TextToSpeechService();
    this.slackService = new SlackService();
  }

  async initialize() {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = new Promise<void>(async (resolve) => {
      try {
        console.log('Starting OpenAIService initialization...');
        
        // Wait for authentication
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          console.log('No active session found during initialization');
          this.initialized = false;
          resolve();
          return;
        }

        // Fetch default workspace
        const { data: settings } = await supabase
          .from('settings')
          .select('default_workspace_id')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (settings?.default_workspace_id) {
          this.slackAccountId = settings.default_workspace_id;
          console.log('Initialized with workspace ID:', this.slackAccountId);
          this.initialized = true;
        } else {
          // Try to get first available workspace
          const { data: workspaces } = await supabase
            .from('slack_accounts')
            .select('id')
            .eq('user_id', session.user.id)
            .limit(1)
            .maybeSingle();

          if (workspaces?.id) {
            this.slackAccountId = workspaces.id;
            console.log('Initialized with first available workspace ID:', this.slackAccountId);
            this.initialized = true;
          } else {
            console.log('No workspace found during initialization');
            this.initialized = false;
          }
        }

        resolve();
      } catch (error) {
        console.error('Error during OpenAIService initialization:', error);
        this.initialized = false;
        resolve();
      }
    });

    return this.initializationPromise;
  }

  setSlackAccountId(id: string | null) {
    console.log('Setting Slack account ID:', id);
    this.slackAccountId = id;
    this.initialized = true;
  }

  getSlackAccountId(): string | null {
    return this.slackAccountId;
  }

  isInitialized(): boolean {
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
    console.log('OpenAIService: Cleaning up...');
    this.textToSpeechService.cleanup();
    this.conversationHistory = [];
    this.pendingMessage = null;
    this.slackAccountId = null;
    this.initialized = false;
  }
}
