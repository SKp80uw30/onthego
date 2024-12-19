import { supabase } from "@/integrations/supabase/client";
import { TextToSpeechService } from "../../TextToSpeechService";
import { SlackService } from "../../SlackService";
import { OpenAIState } from "../OpenAIState";
import { ChatResponse } from "../types";

export class MessageHandler {
  constructor(
    private state: OpenAIState,
    private textToSpeechService: TextToSpeechService,
    private slackService: SlackService
  ) {}

  async handleSendMessage(chatResponse: ChatResponse, slackAccountId: string) {
    if (!chatResponse.messageContent || !chatResponse.channelName) {
      await this.textToSpeechService.speakText("I couldn't determine the message content or channel. Could you please try again?");
      return;
    }

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

  async handleFetchMessages(chatResponse: ChatResponse, slackAccountId: string) {
    if (!chatResponse.channelName) {
      await this.textToSpeechService.speakText("I couldn't determine which channel to fetch messages from. Could you please specify the channel name?");
      return;
    }

    console.log('Initiating message fetch:', {
      channelName: chatResponse.channelName,
      messageCount: chatResponse.messageCount,
      slackAccountId
    });
    
    try {
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
        
        const noMessagesText = `I couldn't find any recent messages in the ${chatResponse.channelName} channel. Would you like to try a different channel?`;
        await this.textToSpeechService.speakText(noMessagesText);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      const errorMessage = `I encountered an error trying to fetch messages from ${chatResponse.channelName}. This might be because the channel doesn't exist or I don't have access to it. Would you like to try a different channel?`;
      await this.textToSpeechService.speakText(errorMessage);
    }
  }

  async handleFetchMentions(chatResponse: ChatResponse, slackAccountId: string) {
    try {
      // Always fetch the user's Slack handle first
      const { data: slackAccount } = await supabase
        .from('slack_accounts')
        .select('slack_user_handle')
        .eq('id', slackAccountId)
        .single();

      if (!slackAccount?.slack_user_handle) {
        await this.textToSpeechService.speakText("I couldn't find your Slack handle. Please make sure your Slack workspace is properly connected.");
        return;
      }

      // If no channel specified or explicitly set to 'ALL', search across all channels
      const channelToSearch = (!chatResponse.channelName || chatResponse.channelName.toUpperCase() === 'ALL') ? 'ALL' : chatResponse.channelName;

      console.log('Fetching mentions:', {
        channelName: channelToSearch,
        slackAccountId,
        userHandle: slackAccount.slack_user_handle
      });
      
      const messages = await this.slackService.fetchMessages(
        channelToSearch,
        slackAccountId,
        chatResponse.messageCount || 10,
        true,
        slackAccount.slack_user_handle
      );

      if (messages && messages.length > 0) {
        console.log('Mentions fetched successfully:', {
          count: messages.length,
          channelName: channelToSearch
        });
        
        this.state.addToConversationHistory({
          role: 'system',
          content: `Here are your mentions ${channelToSearch === 'ALL' ? 'across all channels' : `from #${channelToSearch}`}:\n${messages.join('\n')}`
        });
        
        const messageText = `Here are your mentions ${channelToSearch === 'ALL' ? 'across all channels' : `from ${channelToSearch}`}: ${messages.join('. Next mention: ')}`;
        await this.textToSpeechService.speakText(messageText);
      } else {
        console.log('No mentions found:', {
          channelName: channelToSearch,
          slackAccountId
        });
        
        const noMessagesText = `I couldn't find any mentions ${channelToSearch === 'ALL' ? 'across any channels' : `in ${channelToSearch}`}. Would you like to check a different ${channelToSearch === 'ALL' ? 'time period' : 'channel'}?`;
        await this.textToSpeechService.speakText(noMessagesText);
      }
    } catch (error) {
      console.error('Error fetching mentions:', error);
      const errorMessage = `I encountered an error trying to fetch your mentions. This might be because of access permissions. Would you like to try again?`;
      await this.textToSpeechService.speakText(errorMessage);
    }
  }
}