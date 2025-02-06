import { logError, logInfo } from '../../_shared/logging.ts';
import { sendChannelMessage } from '../../slack/channels/send-message.ts';
import { fetchChannelMessages } from '../../slack/channels/fetch-messages.ts';

export async function handleChannelTools(toolName: string, args: Record<string, any>) {
  try {
    switch (toolName) {
      case 'Send_slack_message': {
        if (!args.Send_message_approval) {
          return "Message not approved for sending";
        }

        await sendChannelMessage(
          args.Channel_name,
          args.Channel_message
        );
        return "Message sent successfully to channel";
      }

      case 'Fetch_slack_messages': {
        const messages = await fetchChannelMessages(
          args.Channel_name,
          args.Number_fetch_messages || 5
        );
        return JSON.stringify({ Recent_messages: messages });
      }

      default:
        throw new Error(`Unknown channel tool: ${toolName}`);
    }
  } catch (error) {
    logError('handleChannelTools', error);
    throw error;
  }
}