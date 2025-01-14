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

  console.log('Processing tool:', { toolName, arguments: toolArgs });

  switch (toolName) {
    case 'send_message': {
      if (!toolArgs.Send_message_approval) {
        return {
          toolCallId,
          result: "Message not approved for sending"
        };
      }

      const result = await sendSlackMessage(
        toolArgs.Channel_name as string,
        toolArgs.Channel_message as string
      );

      return {
        toolCallId,
        result
      };
    }

    case 'send_direct_message': {
      // Route to the dedicated DM edge function
      const { data, error } = await supabase.functions.invoke('send-slack-dm', {
        body: { message: toolCall }
      });

      if (error) throw error;
      return {
        toolCallId,
        result: data.result
      };
    }

    case 'fetch_messages': {
      const messages = await fetchSlackMessages(
        toolArgs.Channel_name as string,
        toolArgs.Number_fetch_messages as number
      );

      return {
        toolCallId,
        result: JSON.stringify({
          Recent_messages: messages
        })
      };
    }

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}