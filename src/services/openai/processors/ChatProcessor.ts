import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { OpenAIState } from "../OpenAIState";
import { ChatResponse } from "../types";
import { MessageHandler } from "../handlers/MessageHandler";

export class ChatProcessor {
  constructor(
    private state: OpenAIState,
    private messageHandler: MessageHandler
  ) {}

  async processChatResponse(transcribedText: string, slackAccountId: string): Promise<{ transcribedText: string; aiResponse: string }> {
    try {
      // Add user message to conversation history
      await this.state.addToConversationHistory({ role: 'user', content: transcribedText });

      console.log('Sending chat request with:', { transcribedText, slackAccountId });
      const { data: chatResponse, error: chatError } = await supabase.functions.invoke('chat-with-ai', {
        body: {
          message: transcribedText,
          slackAccountId: slackAccountId,
          conversationHistory: await this.state.getConversationHistory(),
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
      
      // Add assistant response to conversation history
      await this.state.addToConversationHistory({ role: 'assistant', content: chatResponse.response });
      
      await this.handleChatResponse(chatResponse, transcribedText, slackAccountId);

      return { transcribedText, aiResponse: chatResponse.response };
    } catch (error) {
      console.error('Error processing chat response:', error);
      if (error.message?.includes('quota_exceeded')) {
        toast.error('AI service is currently unavailable due to quota limits. Please try again later.');
      } else {
        toast.error('Error processing your request. Please try again.');
      }
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
}