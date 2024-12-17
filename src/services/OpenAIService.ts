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

      console.log('Processing audio chunk...');
      const transcribedText = await this.audioTranscriptionService.transcribeAudio(audioBlob);
      console.log('User said:', transcribedText);

      // Check if we have a pending message waiting for confirmation
      if (this.pendingMessage) {
        if (transcribedText.toLowerCase().includes('yes') || transcribedText.toLowerCase().includes('confirm')) {
          console.log('User confirmed message, sending to Slack...');
          await this.slackService.sendMessage(
            this.pendingMessage.content,
            this.pendingMessage.channelName,
            this.slackAccountId
          );
          await this.textToSpeechService.speakText('Message sent successfully.');
          this.pendingMessage = null;
          return;
        } else if (transcribedText.toLowerCase().includes('no') || transcribedText.toLowerCase().includes('cancel')) {
          console.log('User cancelled message send');
          await this.textToSpeechService.speakText('Message cancelled.');
          this.pendingMessage = null;
          return;
        }
      }

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
      this.conversationHistory.push(
        { role: 'user', content: transcribedText },
        { role: 'assistant', content: chatResponse.response }
      );

      // Speak the AI's response
      await this.textToSpeechService.speakText(chatResponse.response);

      // Handle AI actions
      if (chatResponse.action === 'SEND_MESSAGE') {
        console.log('AI suggested sending message:', chatResponse);
        this.pendingMessage = {
          content: chatResponse.messageContent,
          channelName: chatResponse.channelName
        };
      } else if (chatResponse.action === 'FETCH_MESSAGES') {
        console.log('Fetching messages from Slack...');
        const messages = await this.slackService.fetchMessages(
          chatResponse.channelName,
          this.slackAccountId
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
    this.pendingMessage = null;
  }
}