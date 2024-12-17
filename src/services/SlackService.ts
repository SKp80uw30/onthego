import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export class SlackService {
  async sendMessage(message: string, channelName: string, slackAccountId: string): Promise<void> {
    try {
      const { error } = await supabase.functions.invoke('send-slack-message', {
        body: { message, channelName, slackAccountId }
      });

      if (error) throw error;
      toast.success('Message sent to Slack!');
    } catch (error) {
      console.error('Error sending message to Slack:', error);
      toast.error('Failed to send message to Slack');
      throw error;
    }
  }

  async fetchMessages(channelName: string, slackAccountId: string) {
    try {
      const { data, error } = await supabase.functions.invoke('chat-with-ai', {
        body: {
          command: 'FETCH_MESSAGES',
          channelName,
          slackAccountId
        }
      });

      if (error) throw error;
      return data.messages;
    } catch (error) {
      console.error('Error fetching Slack messages:', error);
      toast.error('Failed to fetch Slack messages');
      throw error;
    }
  }
}