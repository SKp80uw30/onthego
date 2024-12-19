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

      // Handle specific actions
      if (chatResponse.action === 'SEND_MESSAGE' && chatResponse.messageContent && chatResponse.channelName) {
        console.log('Preparing to send message:', {
          channelName: chatResponse.channelName,
          messageLength: chatResponse.messageContent.length
        });
        
        this.state.setPendingMessage({
          content: chatResponse.messageContent,
          channelName: chatResponse.channelName
        });
        
        const confirmationMessage = `I'll send this message to ${chatResponse.channelName}: "${chatResponse.messageContent}". Would you like to confirm sending this message?`;
        await this.textToSpeechService.speakText(confirmationMessage);
      } 
      else if (chatResponse.action === 'FETCH_MENTIONS' && chatResponse.channelName) {
        console.log('Fetching mentions:', {
          channelName: chatResponse.channelName,
          timestamp: chatResponse.timestamp,
          slackAccountId
        });
        
        let messages;
        if (chatResponse.channelName.toUpperCase() === 'ALL') {
          // Fetch mentions across all channels
          const { data: accounts } = await supabase
            .from('slack_accounts')
            .select('*')
            .eq('id', slackAccountId)
            .single();

          if (!accounts) {
            throw new Error('Slack account not found');
          }

          messages = await this.slackService.fetchMessages(
            'ALL', // Special identifier for all channels
            slackAccountId,
            chatResponse.messageCount || 10,
            true // fetchMentions flag
          );
        } else {
          // Fetch mentions from specific channel
          messages = await this.slackService.fetchMessages(
            chatResponse.channelName,
            slackAccountId,
            chatResponse.messageCount || 10,
            true // fetchMentions flag
          );
        }

        if (messages && messages.length > 0) {
          console.log('Mentions fetched successfully:', {
            count: messages.length,
            channelName: chatResponse.channelName
          });
          
          this.state.addToConversationHistory({
            role: 'system',
            content: `Here are the mentions ${chatResponse.channelName === 'ALL' ? 'across all channels' : `from #${chatResponse.channelName}`}:\n${messages.join('\n')}`
          });
          
          const messageText = `Here are your mentions ${chatResponse.channelName === 'ALL' ? 'across all channels' : `from ${chatResponse.channelName}`}: ${messages.join('. Next mention: ')}`;
          await this.textToSpeechService.speakText(messageText);
        } else {
          console.log('No mentions found:', {
            channelName: chatResponse.channelName,
            slackAccountId
          });
          
          const noMessagesText = `No mentions found ${chatResponse.channelName === 'ALL' ? 'across any channels' : `in ${chatResponse.channelName}`}`;
          await this.textToSpeechService.speakText(noMessagesText);
        }
      }
      else if (chatResponse.action === 'FETCH_MESSAGES' && chatResponse.channelName) {
        console.log('Initiating message fetch:', {
          channelName: chatResponse.channelName,
          messageCount: chatResponse.messageCount,
          slackAccountId
        });
        
        const messages = await this.slackService.fetchMessages(
          chatResponse.channelName, 
          slackAccountId,
          chatResponse.messageCount || 3
        );
        
        if (messages && messages.length > 0) {
          console.log('Messages fetched successfully:', {
            count: messages.length,
            requestedCount: chatResponse.messageCount,
            channelName: chatResponse.channelName
          });
          
          this.state.addToConversationHistory({
            role: 'system',
            content: `Here are the messages from #${chatResponse.channelName}:\n${messages.join('\n')}`
          });
          
          const messageText = `Here are the recent messages from ${chatResponse.channelName}: ${messages.join('. Next message: ')}`;
          await this.textToSpeechService.speakText(messageText);
        } else {
          console.warn('No messages found:', {
            channelName: chatResponse.channelName,
            slackAccountId
          });
          
          const noMessagesText = `No recent messages found in ${chatResponse.channelName}`;
          await this.textToSpeechService.speakText(noMessagesText);
        }
      }
    } catch (error) {
      console.error('Detailed error in handleChatResponse:', {
        error,
        errorType: error.constructor.name,
        stack: error.stack,
        action: chatResponse.action,
        slackAccountId
      });
      toast.error('Error processing chat response');
      throw error;
    }
  }

  cleanup() {
    this.textToSpeechService.cleanup();
  }
}