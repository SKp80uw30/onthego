import { logError, logInfo } from '../../_shared/logging.ts';
import { getSlackAccount } from '../common/auth.ts';
import { callSlackApi } from '../common/api.ts';

export async function fetchDMMessages(
  userId: string,
  messageCount: number = 5
): Promise<string[]> {
  try {
    const slackAccount = await getSlackAccount();
    
    logInfo('fetchDMMessages', {
      userId,
      requestedCount: messageCount
    });

    // Open DM channel
    const channelResponse = await callSlackApi(
      'conversations.open',
      slackAccount.slack_bot_token,
      'POST',
      { users: userId }
    );

    if (!channelResponse.channel?.id) {
      throw new Error('Failed to open DM channel');
    }

    // Fetch messages from the channel
    const messagesResponse = await callSlackApi(
      'conversations.history',
      slackAccount.slack_bot_token,
      'GET',
      {
        channel: channelResponse.channel.id,
        limit: messageCount
      }
    );

    const messages = messagesResponse.messages.map((msg: any) => msg.text);
    
    logInfo('DM messages fetched successfully', {
      userId,
      channelId: channelResponse.channel.id,
      messageCount: messages.length
    });

    return messages;
  } catch (error) {
    logError('fetchDMMessages', error);
    throw error;
  }
}