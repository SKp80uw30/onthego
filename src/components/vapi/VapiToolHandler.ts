import { supabase } from '@/integrations/supabase/client';

export const createToolHandler = () => {
  return async (parameters: any) => {
    console.log('Tool handler called with parameters:', parameters);

    try {
      const requestBody = {
        message: {
          toolCalls: [{
            type: "function",
            function: {
              name: "Send_slack_message",
              arguments: {
                Channel_name: parameters.Channel_name,
                Channel_message: parameters.Channel_message,
                Send_message_approval: parameters.Send_message_approval
              }
            }
          }]
        }
      };
      
      console.log('Sending request to vapi-tools function:', requestBody);
      
      const { data, error } = await supabase.functions.invoke('vapi-tools', {
        body: requestBody
      });

      if (error) {
        console.error('Error from vapi-tools function:', error);
        throw error;
      }

      if (!data?.ok) {
        console.error('Error response from Slack:', data);
        throw new Error(data?.error || 'Failed to send message to Slack');
      }

      console.log('Successful response from vapi-tools:', data);
      return { success: true, message: 'Message sent successfully' };
    } catch (error) {
      console.error('Error in send_slack_message tool handler:', error);
      throw error;
    }
  };
};