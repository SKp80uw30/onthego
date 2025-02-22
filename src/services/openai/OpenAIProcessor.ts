import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TextToSpeechService } from "../TextToSpeechService";
import { SlackService } from "../SlackService";
import { OpenAIState } from "./OpenAIState";
import { ChatResponse } from "./types";
import { MessageHandler } from "./handlers/MessageHandler";

export class OpenAIProcessor {
  private state: OpenAIState;
  private textToSpeechService: TextToSpeechService;
  private slackService: SlackService;
  private messageHandler: MessageHandler;

  constructor(state: OpenAIState) {
    this.state = state;
    this.textToSpeechService = new TextToSpeechService();
    this.slackService = new SlackService();
    this.messageHandler = new MessageHandler(state, this.textToSpeechService, this.slackService);
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

      try {
        const response = await this.processChatResponse(transcribedText, currentSlackId);
        return response;
      } catch (error) {
        if (error.message?.includes('quota_exceeded')) {
          toast.error('AI service is currently unavailable due to quota limits. Please try again later.');
        } else {
          toast.error('Error processing your request. Please try again.');
        }
        throw error;
      }
    } catch (error) {
      console.error(`[OpenAIProcessor ${this.state.getInstanceId()}] Error:`, error);
      throw error;
    }
  }

  private async processChatResponse(transcribedText: string, slackAccountId: string) {
    try {
      console.log('Sending chat request with:', { transcribedText, slackAccountId });
      const { data: chatResponse, error: chatError } = await supabase.functions.invoke('chat-with-ai', {
        body: {
          message: transcribedText,
          slackAccountId: slackAccountId,
          conversationHistory: this.state.getConversationHistory(),
        },
      });

      if (chatError) {
        console.error('Chat API error:', chatError);
        throw chatError;
      }

      if (!chatResponse) {
        console.error('No chat response received');
        throw new Error('No response from chat service');
      }

      console.log('Received chat response:', chatResponse);
      await this.handleChatResponse(chatResponse, transcribedText, slackAccountId);
      
      // Always speak the AI's response
      if (chatResponse.response) {
        await this.textToSpeechService.speakText(chatResponse.response);
      }

      return { transcribedText, aiResponse: chatResponse.response };
    } catch (error) {
      console.error('Error processing chat response:', error);
      throw error;
    }
  }

  private async handleChatResponse(chatResponse: ChatResponse, transcribedText: string, slackAccountId: string) {
    try {
      console.log('Processing chat response:', {
        action: chatResponse.action,
        hasMessageContent: !!chatResponse.messageContent,
        hasChannelName: !!chatResponse.channelName,
        messageCount: chatResponse.messageCount,
        slackAccountId
      });

      // Update conversation history
      this.state.addToConversationHistory({ role: 'user', content: transcribedText });
      this.state.addToConversationHistory({ role: 'assistant', content: chatResponse.response });

      // Validate Slack connection before proceeding with Slack operations
      if ((chatResponse.action === 'SEND_MESSAGE' || chatResponse.action === 'FETCH_MESSAGES' || chatResponse.action === 'FETCH_MENTIONS') && 
          !(await this.slackService.validateSlackConnection(slackAccountId))) {
        console.error('Invalid Slack connection:', { slackAccountId });
        await this.textToSpeechService.speakText('Sorry, there seems to be an issue with the Slack connection. Please check your workspace connection and try again.');
        return;
      }

      // Handle specific actions using the MessageHandler
      switch (chatResponse.action) {
        case 'SEND_MESSAGE':
          await this.messageHandler.handleSendMessage(chatResponse, slackAccountId);
          break;
        case 'FETCH_MESSAGES':
          await this.messageHandler.handleFetchMessages(chatResponse, slackAccountId);
          break;
        case 'FETCH_MENTIONS':
          await this.messageHandler.handleFetchMentions(chatResponse, slackAccountId);
          break;
      }
    } catch (error) {
      console.error('Error in handleChatResponse:', error);
      toast.error('Error processing chat response');
      throw error;
    }
  }

  cleanup() {
    this.textToSpeechService.cleanup();
  }
}