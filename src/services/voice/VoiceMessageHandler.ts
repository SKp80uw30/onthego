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
      toast.error('No Slack workspace connected');
      return;
    }
    
    try {
      const { data: response, error } = await supabase.functions.invoke('openai-chat', {
        body: {
          message: text,
          slackAccountId,
          conversationHistory: this.voiceState.getChatState().getConversationHistory()
        }
      });

      if (error) throw error;

      this.voiceState.getChatState().addMessage({ role: 'user', content: text });
      
      if (response.function_call) {
        const functionResult = await this.handleFunctionCall(response.function_call, slackAccountId);
        
        this.voiceState.getChatState().addMessage({
          role: 'function',
          name: response.function_call.name,
          content: functionResult
        });
        
        const { data: finalResponse, error: finalError } = await supabase.functions.invoke('openai-chat', {
          body: {
            message: functionResult,
            slackAccountId,
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
      const args = JSON.parse(functionCall.arguments);
      
      switch (functionCall.name) {
        case 'send_message': {
          const { channelName, message } = args;
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