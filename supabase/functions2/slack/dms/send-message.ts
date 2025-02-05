import { logError, logInfo } from '../../_shared/logging.ts';
import { getSlackAccount } from '../common/auth.ts';
import { callSlackApi } from '../common/api.ts';

export async function sendDMMessage(userId: string, message: string): Promise<void> {
  try {
    if (!userId || !message) {
      throw new Error('Missing required parameters: userId and message are required');
    }

    const slackAccount = await getSlackAccount();
    
    logInfo('sendDMMessage', {
      userId,
      messageLength: message.length
    });

    // First, open a DM channel with the user
    const channelResponse = await callSlackApi(
      'conversations.open',
      slackAccount.slack_bot_token,
      'POST',
      { users: userId }
    );

    if (!channelResponse?.channel?.id) {
      throw new Error('Failed to open DM channel');
    }

    // Send the message to the DM channel
    const messageResponse = await callSlackApi(
      'chat.postMessage',
      slackAccount.slack_bot_token,
      'POST',
      {
        channel: channelResponse.channel.id,
        text: message,
      }
    );

    if (!messageResponse?.ok) {
      throw new Error(`Failed to send message: ${messageResponse?.error || 'Unknown error'}`);
    }

    logInfo('DM sent successfully', {
      userId,
      channelId: channelResponse.channel.id
    });
  } catch (error) {
    logError('sendDMMessage', error);
    throw error;
  }
}