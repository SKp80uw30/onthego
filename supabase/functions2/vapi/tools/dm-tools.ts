import { logError, logInfo } from '../../_shared/logging.ts';
import { sendDMMessage } from '../../slack/dms/send-message.ts';

export async function handleDMMessage(args: {
  User_id: string;
  Message: string;
  Send_message_approval: boolean;
}): Promise<{ success: boolean; message: string }> {
  try {
    logInfo('handleDMMessage', args);

    if (!args.Send_message_approval) {
      return {
        success: false,
        message: 'Message not approved for sending',
      };
    }

    await sendDMMessage(args.User_id, args.Message);

    return {
      success: true,
      message: `Message sent to user ${args.User_id}`,
    };
  } catch (error) {
    logError('handleDMMessage', error);
    return {
      success: false,
      message: `Failed to send message: ${error.message}`,
    };
  }
}