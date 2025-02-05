import { createClient } from '@supabase/supabase-js';
import { corsHeaders } from '../_shared/cors.ts';

interface ToolCallResult {
  toolCallId: string;
  result: string | object;
}

export async function handleToolCall(
  toolName: string,
  toolArgs: any,
  toolCallId: string
): Promise<ToolCallResult> {
  console.log('Handling tool call:', { toolName, toolArgs, toolCallId });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  switch (toolName) {
    case 'Send_slack_message': {
      console.log('Handling Send_slack_message with args:', toolArgs);
      // Channel message handling logic here
      // ...
      return {
        toolCallId,
        result: {
          success: true,
          message: "Message sent successfully"
        }
      };
    }

    case 'Send_slack_dm': {
      console.log('Handling Send_slack_dm with args:', toolArgs);
      
      if (!toolArgs.Send_message_approval) {
        console.log('DM not approved for sending');
        return {
          toolCallId,
          result: "Message not approved for sending"
        };
      }

      try {
        console.log('Sending DM to user:', toolArgs.Username);
        const { data, error } = await supabase.functions.invoke('send-slack-dm', {
          body: {
            toolCalls: [{
              id: toolCallId,
              function: {
                name: 'Send_slack_dm',
                arguments: {
                  Username: toolArgs.Username,
                  Message: toolArgs.Message,
                  Send_message_approval: toolArgs.Send_message_approval
                }
              }
            }]
          }
        });

        if (error) {
          console.error('Error from send-slack-dm function:', error);
          throw error;
        }

        console.log('DM sent successfully:', data);
        return {
          toolCallId,
          result: {
            success: true,
            message: "Direct message sent successfully"
          }
        };
      } catch (error) {
        console.error('Error in Send_slack_dm:', error);
        throw error;
      }
    }

    case 'Fetch_slack_messages': {
      console.log('Handling Fetch_slack_messages with args:', toolArgs);
      // Channel messages fetching logic here
      // ...
      return {
        toolCallId,
        result: {
          messages: [],
          count: 0
        }
      };
    }

    case 'Fetch_slack_dms': {
      console.log('Handling Fetch_slack_dms with args:', toolArgs);
      
      if (!toolArgs.Username) {
        console.error('Username is required for fetching DMs');
        throw new Error('Username is required for fetching DMs');
      }

      try {
        console.log('Fetching DMs for user:', toolArgs.Username);
        const { data, error } = await supabase.functions.invoke('vapi-fetch-messages', {
          body: {
            toolCalls: [{
              id: toolCallId,
              function: {
                name: 'Fetch_slack_dms',
                arguments: {
                  Username: toolArgs.Username,
                  Number_fetch_messages: toolArgs.Number_fetch_messages || 5
                }
              }
            }]
          }
        });

        if (error) {
          console.error('Error from vapi-fetch-messages function:', error);
          throw error;
        }

        console.log('DMs fetched successfully:', data);
        return {
          toolCallId,
          result: {
            messages: data.messages || [],
            count: (data.messages || []).length
          }
        };
      } catch (error) {
        console.error('Error in Fetch_slack_dms:', error);
        throw error;
      }
    }

    default: {
      console.error('Unknown tool name:', toolName);
      throw new Error(`Unknown tool name: ${toolName}`);
    }
  }
}
