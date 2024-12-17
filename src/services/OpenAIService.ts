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

  constructor() {
    this.conversationHistory = [];
    this.audioTranscriptionService = new AudioTranscriptionService();
    this.textToSpeechService = new TextToSpeechService();
    this.slackService = new SlackService();
  }

  setSlackAccountId(id: string) {
    this.slackAccountId = id;
  }

  async processAudioChunk(audioBlob: Blob) {
    try {
      if (!this.slackAccountId) {
        toast.error('No Slack account selected');
        return;
      }

      // Step 1: Convert speech to text
      const transcribedText = await this.audioTranscriptionService.transcribeAudio(audioBlob);
      console.log('User said:', transcribedText);

      // Step 2: Process with AI chat
      console.log('Sending to chat-with-ai function...');
      const { data: chatResponse, error: chatError } = await supabase.functions.invoke('chat-with-ai', {
        body: {
          message: transcribedText,
          slackAccountId: this.slackAccountId,
          conversationHistory: this.conversationHistory,
        },
      });

      if (chatError) {
        throw new Error(`Error in AI chat: ${chatError.message}`);
      }

      // Update conversation history
      this.conversationHistory = chatResponse.conversationHistory;

      // Step 3: Convert AI response to speech and play it
      await this.textToSpeechService.speakText(chatResponse.response);

      // Step 4: Handle any actions from the AI response
      if (chatResponse.action === 'SEND_MESSAGE' && chatResponse.confirmed) {
        const { channelName, messageContent } = chatResponse;
        await this.slackService.sendMessage(messageContent, channelName, this.slackAccountId);
      } else if (chatResponse.action === 'FETCH_MESSAGES') {
        const messages = await this.slackService.fetchMessages(chatResponse.channelName, this.slackAccountId);
        // Add fetched messages to conversation history
        this.conversationHistory.push({
          role: 'system',
          content: `Here are the messages from #${chatResponse.channelName}:\n${messages.join('\n')}`
        });
      }

      return { transcribedText, aiResponse: chatResponse.response };
    } catch (error) {
      console.error('Error in OpenAI service:', error);
      toast.error('Error processing audio');
      throw error;
    }
  }

  cleanup() {
    this.textToSpeechService.cleanup();
    this.conversationHistory = [];
  }
}