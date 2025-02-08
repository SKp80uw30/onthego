import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export class SlackService {
  async sendMessage(message: string, channelName: string, slackAccountId: string): Promise<void> {
    try {
      console.log('Starting sendMessage operation:', { message, channelName, slackAccountId });
      const { error, data } = await supabase.functions.invoke('slack/dms/send-message', {
        body: { 
          userIdentifier: channelName,
          Message: message,
          Send_message_approval: true,
          slackAccountId
        }
      });

      if (error) {
        console.error('Error details from send-slack-dm:', {
          error,
          statusCode: error.status,
          message: error.message,
          details: error.details
        });
        throw error;
      }
      
      console.log('Message sent successfully:', data);
      toast.success('Message sent to Slack!');
    } catch (error) {
      console.error('Detailed error in sendMessage:', {
        error,
        type: error.constructor.name,
        slackAccountId,
        channelName
      });
      toast.error('Failed to send message to Slack');
      throw error;
    }
  }

  async fetchMessages(channelName: string, slackAccountId: string, messageCount: number = 5, fetchMentions: boolean = false) {
    try {
      console.log('Starting fetchMessages operation:', { 
        channelName, 
        slackAccountId, 
        messageCount, 
        fetchMentions
      });
      
      // First validate the Slack account exists
      const { data: account, error: accountError } = await supabase
        .from('slack_accounts')
        .select('*')
        .eq('id', slackAccountId)
        .single();

      if (accountError || !account) {
        console.error('Error fetching Slack account:', { accountError, slackAccountId });
        toast.error('Failed to validate Slack account');
        throw new Error('Invalid Slack account');
      }

      const { data, error } = await supabase.functions.invoke('chat-with-ai', {
        body: {
          command: fetchMentions ? 'FETCH_MENTIONS' : 'FETCH_MESSAGES',
          channelName,
          slackAccountId,
          messageCount
        }
      });

      if (error) {
        console.error(`Error details from chat-with-ai (${fetchMentions ? 'FETCH_MENTIONS' : 'FETCH_MESSAGES'}):`, {
          error,
          statusCode: error.status,
          message: error.message,
          details: error.details
        });
        throw error;
      }

      if (!data?.messages) {
        console.warn('No messages returned from Slack:', {
          responseData: data,
          channelName,
          slackAccountId
        });
        return [];
      }

      console.log('Successfully fetched messages:', {
        messageCount: data.messages.length,
        requestedCount: messageCount,
        channelName,
        slackAccountId,
        fetchMentions
      });
      return data.messages;
    } catch (error) {
      console.error('Detailed error in fetchMessages:', {
        error,
        type: error.constructor.name,
        stack: error.stack,
        slackAccountId,
        channelName
      });
      toast.error('Failed to fetch Slack messages');
      throw error;
    }
  }

  async validateSlackConnection(slackAccountId: string): Promise<boolean> {
    try {
      console.log('Validating Slack connection for account:', slackAccountId);
      const { data: account, error } = await supabase
        .from('slack_accounts')
        .select('*')
        .eq('id', slackAccountId)
        .single();

      if (error) {
        console.error('Error validating Slack account:', {
          error,
          slackAccountId
        });
        return false;
      }

      if (!account) {
        console.warn('No Slack account found:', { slackAccountId });
        return false;
      }

      console.log('Slack connection validated successfully');
      return true;
    } catch (error) {
      console.error('Error in validateSlackConnection:', {
        error,
        slackAccountId
      });
      return false;
    }
  }
}
