import { corsHeaders } from '../../_shared/cors.ts';
import { logError, logInfo } from '../../_shared/logging.ts';
import { getSlackAccount } from '../common/auth.ts';
import { getSlackChannel, callSlackApi } from '../common/api.ts';

export async function sendChannelMessage(
  channelName: string,
  message: string
): Promise<void> {
  try {
    const slackAccount = await getSlackAccount();
    const channel = await getSlackChannel(slackAccount.slack_bot_token, channelName);

    logInfo('sendChannelMessage', {
      channelName,
      channelId: channel.id,
      messageLength: message.length
    });

    await callSlackApi(
      'chat.postMessage',
      slackAccount.slack_bot_token,
      'POST',
      {
        channel: channel.id,
        text: message,
      }
    );
  } catch (error) {
    logError('sendChannelMessage', error);
    throw error;
  }
}