import { corsHeaders } from '../../_shared/cors.ts';
import { logError, logInfo } from '../../_shared/logging.ts';
import { getSlackAccount } from '../common/auth.ts';
import { callSlackApi } from '../common/api.ts';

export async function sendDMMessage(
  userId: string,
  message: string
): Promise<void> {
  try {
    const slackAccount = await getSlackAccount();
    
    // First, open or get the DM channel
    const channelResult = await callSlackApi(
      'conversations.open',
      slackAccount.slack_bot_token,
      'POST',
      { users: userId }
    );

    if (!channelResult.ok || !channelResult.channel?.id) {
      throw new Error('Failed to open DM channel');
    }

    logInfo('sendDMMessage', {
      userId,
      channelId: channelResult.channel.id,
      messageLength: message.length
    });

    await callSlackApi(
      'chat.postMessage',
      slackAccount.slack_bot_token,
      'POST',
      {
        channel: channelResult.channel.id,
        text: message,
      }
    );
  } catch (error) {
    logError('sendDMMessage', error);
    throw error;
  }
}