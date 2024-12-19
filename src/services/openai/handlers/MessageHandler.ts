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
    if (!chatResponse.messageContent || !chatResponse.channelName) return;

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
    if (!chatResponse.channelName) return;

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

  async handleFetchMentions(chatResponse: ChatResponse, slackAccountId: string) {
    if (!chatResponse.channelName) return;

    console.log('Fetching mentions:', {
      channelName: chatResponse.channelName,
      timestamp: chatResponse.timestamp,
      slackAccountId
    });
    
    let messages;
    if (chatResponse.channelName.toUpperCase() === 'ALL') {
      const { data: accounts } = await supabase
        .from('slack_accounts')
        .select('*')
        .eq('id', slackAccountId)
        .single();

      if (!accounts) {
        throw new Error('Slack account not found');
      }

      messages = await this.slackService.fetchMessages(
        'ALL',
        slackAccountId,
        chatResponse.messageCount || 10,
        true
      );
    } else {
      messages = await this.slackService.fetchMessages(
        chatResponse.channelName,
        slackAccountId,
        chatResponse.messageCount || 10,
        true
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
}