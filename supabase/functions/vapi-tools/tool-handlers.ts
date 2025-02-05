import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendSlackMessage, fetchSlackMessages } from './slack-operations.ts';

export interface ToolCall {
  id: string;
  function: {
    name: string;
    arguments: string | Record<string, unknown>;
  };
}

export async function handleToolCall(toolCall: ToolCall) {
  const toolName = toolCall.function.name;
  const toolCallId = toolCall.id;
  const toolArgs = typeof toolCall.function.arguments === 'string' 
    ? JSON.parse(toolCall.function.arguments)
    : toolCall.function.arguments;

  console.log('Processing tool call:', { 
    toolName, 
    toolCallId,
    arguments: toolArgs 
  });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  switch (toolName) {
    case 'Send_slack_message': {
      console.log('Handling Send_slack_message with args:', toolArgs);
      
      if (!toolArgs.Send_message_approval) {
        console.log('Message not approved for sending');
        return {
          toolCallId,
          result: "Message not approved for sending"
        };
      }

      try {
        const result = await sendSlackMessage(
          toolArgs.Channel_name as string,
          toolArgs.Channel_message as string
        );

        console.log('Message sent successfully:', result);
        return {
          toolCallId,
          result: "Message sent successfully to channel"
        };
      } catch (error) {
        console.error('Error sending message:', error);
        throw error;
      }
    }

    case 'send_direct_message': {
      console.log('Handling send_direct_message with args:', toolArgs);
      
      if (!toolArgs.Send_message_approval) {
        console.log('DM not approved for sending');
        return {
          toolCallId,
          result: "Message not approved for sending"
        };
      }

      try {
        const { data, error } = await supabase.functions.invoke('send-slack-dm', {
          body: { 
            message: {
              toolCalls: [{
                id: toolCallId,
                function: {
                  name: 'send_direct_message',
                  arguments: {
                    Username: toolArgs.Username,
                    Message: toolArgs.Message,
                    Send_message_approval: toolArgs.Send_message_approval
                  }
                }
              }]
            }
          }
        });

        if (error) {
          console.error('Error sending DM:', error);
          throw error;
        }

        console.log('DM sent successfully:', data);
        return data.results[0];
      } catch (error) {
        console.error('Error in send_direct_message:', error);
        throw error;
      }
    }

    case 'Fetch_slack_messages': {
      console.log('Handling Fetch_slack_messages with args:', toolArgs);
      
      try {
        const messages = await fetchSlackMessages(
          toolArgs.Channel_name as string,
          toolArgs.Number_fetch_messages as number || 5
        );

        console.log('Messages fetched successfully:', messages);
        return {
          toolCallId,
          result: JSON.stringify({
            Recent_messages: messages
          })
        };
      } catch (error) {
        console.error('Error fetching messages:', error);
        throw error;
      }
    }

    case 'Fetch_slack_dms': {
      console.log('Handling Fetch_slack_dms with args:', toolArgs);
      
      try {
        const { data, error } = await supabase.functions.invoke('send-slack-dm', {
          body: { 
            message: {
              toolCalls: [{
                id: toolCallId,
                function: {
                  name: 'Fetch_slack_dms',
                  arguments: {
                    Username: toolArgs.Username,
                    messageCount: toolArgs.messageCount || 5
                  }
                }
              }]
            }
          }
        });

        if (error) {
          console.error('Error fetching DMs:', error);
          throw error;
        }

        console.log('DMs fetched successfully:', data);
        return {
          toolCallId,
          result: JSON.stringify({
            Messages: data.messages || []
          })
        };
      } catch (error) {
        console.error('Error fetching DMs:', error);
        throw error;
      }
    }

    default:
      console.error('Unknown tool:', toolName);
      throw new Error(`Unknown tool: ${toolName}`);
  }
}