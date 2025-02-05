import { logError, logInfo } from '../../_shared/logging.ts';
import { sendChannelMessage } from '../../slack/channels/send-message.ts';

export async function handleChannelMessage(args: {
  Channel_name: string;
  Channel_message: string;
  Send_message_approval: boolean;
}): Promise<{ success: boolean; message: string }> {
  try {
    logInfo('handleChannelMessage', args);

    if (!args.Send_message_approval) {
      return {
        success: false,
        message: 'Message not approved for sending',
      };
    }

    await sendChannelMessage(args.Channel_name, args.Channel_message);

    return {
      success: true,
      message: `Message sent to channel ${args.Channel_name}`,
    };
  } catch (error) {
    logError('handleChannelMessage', error);
    return {
      success: false,
      message: `Failed to send message: ${error.message}`,
    };
  }
}