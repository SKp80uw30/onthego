import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AudioService } from '@/services/AudioService';
import { VoiceStateManager } from './VoiceStateManager';

export class VoiceMessageHandler {
  private audioService: AudioService;
  private voiceState: VoiceStateManager;

  constructor(audioService: AudioService, voiceState: VoiceStateManager) {
    this.audioService = audioService;
    this.voiceState = voiceState;
  }

  async handleMessage(text: string) {
    if (!text) return;
    
    const slackAccountId = this.voiceState.getCurrentSlackAccountId();
    if (!slackAccountId) {
      console.error('No Slack account ID available');
      toast.error('No Slack workspace connected');
      return;
    }

    console.log('Processing message with Slack account ID:', slackAccountId);
    
    try {
      const { data: response, error } = await supabase.functions.invoke('chat-with-ai', {
        body: {
          message: text,
          slackAccountId,
          command: 'PROCESS_MESSAGE',
          conversationHistory: this.voiceState.getChatState().getConversationHistory()
        }
      });

      if (error) throw error;

      this.voiceState.getChatState().addMessage({ role: 'user', content: text });
      
      if (response.function_call) {
        console.log('Handling function call:', response.function_call.name);
        const functionResult = await this.handleFunctionCall(response.function_call, slackAccountId);
        
        this.voiceState.getChatState().addMessage({
          role: 'function',
          name: response.function_call.name,
          content: functionResult
        });
        
        const { data: finalResponse, error: finalError } = await supabase.functions.invoke('chat-with-ai', {
          body: {
            message: functionResult,
            slackAccountId,
            command: 'PROCESS_RESPONSE',
            conversationHistory: this.voiceState.getChatState().getConversationHistory()
          }
        });

        if (finalError) throw finalError;
        
        if (finalResponse.content) {
          await this.audioService.textToSpeech(finalResponse.content);
        }
        
        this.voiceState.getChatState().addMessage(finalResponse);
      } else if (response.content) {
        await this.audioService.textToSpeech(response.content);
        this.voiceState.getChatState().addMessage(response);
      }
    } catch (error) {
      console.error('Error processing message:', error);
      toast.error('Failed to process your request');
      throw error;
    }
  }

  private async handleFunctionCall(functionCall: any, slackAccountId: string) {
    try {
      console.log('Processing function call with Slack account ID:', slackAccountId);
      const args = JSON.parse(functionCall.arguments);
      
      switch (functionCall.name) {
        case 'send_message': {
          const { channelName, message } = args;
          console.log('Sending message to Slack:', { channelName, message, slackAccountId });
          const response = await supabase.functions.invoke('slack-operations', {
            body: { 
              action: 'SEND_MESSAGE', 
              channelName, 
              message,
              slackAccountId 
            }
          });
          return response.data?.message || 'Message sent successfully';
        }
        case 'fetch_messages': {
          const { channelName, count } = args;
          console.log('Fetching messages from Slack:', { channelName, count, slackAccountId });
          const response = await supabase.functions.invoke('slack-operations', {
            body: { 
              action: 'FETCH_MESSAGES', 
              channelName, 
              count,
              slackAccountId 
            }
          });
          return response.data?.messages?.join('\n') || 'No messages found';
        }
        case 'fetch_mentions': {
          const { channelName, count } = args;
          console.log('Fetching mentions from Slack:', { channelName, count, slackAccountId });
          const response = await supabase.functions.invoke('slack-operations', {
            body: { 
              action: 'FETCH_MENTIONS', 
              channelName, 
              count,
              slackAccountId 
            }
          });
          return response.data?.messages?.join('\n') || 'No mentions found';
        }
        default:
          throw new Error(`Unknown function: ${functionCall.name}`);
      }
    } catch (error) {
      console.error('Error executing function:', error);
      throw error;
    }
  }
}