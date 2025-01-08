import { supabase } from '@/integrations/supabase/client';

export const createToolHandler = () => {
  return async (parameters: any) => {
    console.log('Tool handler called with parameters:', parameters);

    try {
      const requestBody = {
        tool: 'send_slack_message',
        parameters: {
          channelName: parameters.Channel_name,
          message: parameters.Channel_message
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

      console.log('Successful response from vapi-tools:', data);
      return data;
    } catch (error) {
      console.error('Error in send_slack_message tool handler:', error);
      throw error;
    }
  };
};