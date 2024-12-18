import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TextToSpeechService } from "../TextToSpeechService";
import { SlackService } from "../SlackService";
import { OpenAIState } from "./OpenAIState";
import { ChatResponse } from "./types";

export class OpenAIProcessor {
  private state: OpenAIState;
  private textToSpeechService: TextToSpeechService;
  private slackService: SlackService;

  constructor(state: OpenAIState) {
    this.state = state;
    this.textToSpeechService = new TextToSpeechService();
    this.slackService = new SlackService();
  }

  async processAudioChunk(audioBlob: Blob): Promise<{ transcribedText: string; aiResponse: string } | void> {
    try {
      console.log(`[OpenAIProcessor ${this.state.getInstanceId()}] Starting audio chunk processing`);
      
      if (!this.state.isInitialized()) {
        console.error('OpenAI service not initialized');
        toast.error('Service not ready yet. Please try again in a moment.');
        return;
      }

      const currentSlackId = this.state.getSlackAccountId();
      if (!currentSlackId) {
        console.error('No Slack account selected');
        toast.error('No Slack account selected');
        return;
      }

      // Create a new FormData instance and append the audio blob
      const formData = new FormData();
      formData.append('file', new Blob([audioBlob], { type: 'audio/webm' }), 'audio.webm');

      const { data: transcriptionResponse, error: transcriptionError } = await supabase.functions.invoke('process-audio', {
        body: formData,
      });

      if (transcriptionError || !transcriptionResponse) {
        console.error('Transcription error:', transcriptionError || 'No response data');
        toast.error('Error transcribing audio. Please try again.');
        return;
      }

      if (!transcriptionResponse.text) {
        console.error('No transcription text in response:', transcriptionResponse);
        toast.error('Could not transcribe audio. Please try again.');
        return;
      }

      const transcribedText = transcriptionResponse.text;
      console.log(`[OpenAIProcessor ${this.state.getInstanceId()}] Transcription completed:`, transcribedText);

      // Handle pending message confirmation
      const pendingMessage = this.state.getPendingMessage();
      if (pendingMessage) {
        return this.handlePendingMessage(transcribedText, pendingMessage, currentSlackId);
      }

      // Process with ChatGPT
      return this.processChatResponse(transcribedText, currentSlackId);
    } catch (error) {
      console.error(`[OpenAIProcessor ${this.state.getInstanceId()}] Error:`, error);
      toast.error('Error processing audio');
      throw error;
    }
  }

  private async handlePendingMessage(transcribedText: string, pendingMessage: { content: string; channelName: string }, slackAccountId: string) {
    if (transcribedText.toLowerCase().includes('yes') || transcribedText.toLowerCase().includes('confirm')) {
      await this.slackService.sendMessage(pendingMessage.content, pendingMessage.channelName, slackAccountId);
      await this.textToSpeechService.speakText('Message sent successfully.');
      this.state.setPendingMessage(null);
      return;
    } 
    
    if (transcribedText.toLowerCase().includes('no') || transcribedText.toLowerCase().includes('cancel')) {
      await this.textToSpeechService.speakText('Message cancelled.');
      this.state.setPendingMessage(null);
      return;
    }
  }

  private async processChatResponse(transcribedText: string, slackAccountId: string) {
    const { data: chatResponse, error: chatError } = await supabase.functions.invoke('chat-with-ai', {
      body: {
        message: transcribedText,
        slackAccountId: slackAccountId,
        conversationHistory: this.state.getConversationHistory(),
      },
    });

    if (chatError) {
      throw new Error(`Error in AI chat: ${chatError.message}`);
    }

    await this.handleChatResponse(chatResponse, transcribedText, slackAccountId);
    return { transcribedText, aiResponse: chatResponse.response };
  }

  private async handleChatResponse(chatResponse: ChatResponse, transcribedText: string, slackAccountId: string) {
    // Update conversation history
    this.state.addToConversationHistory({ role: 'user', content: transcribedText });
    this.state.addToConversationHistory({ role: 'assistant', content: chatResponse.response });

    // Speak the AI's response
    await this.textToSpeechService.speakText(chatResponse.response);

    // Handle specific actions
    if (chatResponse.action === 'SEND_MESSAGE') {
      this.state.setPendingMessage({
        content: chatResponse.messageContent!,
        channelName: chatResponse.channelName!
      });
      await this.textToSpeechService.speakText(
        `I'll send this message to ${chatResponse.channelName}: "${chatResponse.messageContent}". Would you like to confirm sending this message?`
      );
    } else if (chatResponse.action === 'FETCH_MESSAGES') {
      const messages = await this.slackService.fetchMessages(chatResponse.channelName!, slackAccountId);
      this.state.addToConversationHistory({
        role: 'system',
        content: `Here are the messages from #${chatResponse.channelName}:\n${messages.join('\n')}`
      });
      await this.textToSpeechService.speakText(
        `Here are the recent messages from ${chatResponse.channelName}: ${messages.join('. Next message: ')}`
      );
    }
  }

  cleanup() {
    this.textToSpeechService.cleanup();
  }
}