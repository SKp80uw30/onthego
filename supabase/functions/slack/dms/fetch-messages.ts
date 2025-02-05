import { logError, logInfo } from '../../_shared/logging.ts';
import { getSlackAccount } from '../common/auth.ts';
import { callSlackApi } from '../common/api.ts';

const RETRY_AFTER_DEFAULT = 60;
const MAX_RETRIES = 3;

async function wait(seconds: number) {
  return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

export async function fetchDMMessages(
  userId: string,
  messageCount: number = 5,
  retryCount = 0
): Promise<string[]> {
  try {
    if (!userId) {
      throw new Error('Missing required parameter: userId');
    }

    const slackAccount = await getSlackAccount();
    
    logInfo('fetchDMMessages', {
      userId,
      requestedCount: messageCount,
      retryAttempt: retryCount
    });

    // Open DM channel
    const channelResponse = await callSlackApi(
      'conversations.open',
      slackAccount.slack_bot_token,
      'POST',
      { users: userId }
    );

    if (!channelResponse?.channel?.id) {
      throw new Error('Failed to open DM channel');
    }

    // Fetch messages from the channel
    try {
      const messagesResponse = await callSlackApi(
        'conversations.history',
        slackAccount.slack_bot_token,
        'GET',
        {
          channel: channelResponse.channel.id,
          limit: messageCount
        }
      );

      if (!messagesResponse?.messages) {
        throw new Error('No messages found in response');
      }

      const messages = messagesResponse.messages.map((msg: any) => msg.text || '');
      
      logInfo('DM messages fetched successfully', {
        userId,
        channelId: channelResponse.channel.id,
        messageCount: messages.length
      });

      return messages;
    } catch (error) {
      if (error.status === 429 && retryCount < MAX_RETRIES) {
        const retryAfter = parseInt(error.headers?.get('Retry-After') || String(RETRY_AFTER_DEFAULT));
        logInfo('Rate limited, waiting before retry', {
          retryAfter,
          retryCount: retryCount + 1,
          maxRetries: MAX_RETRIES
        });
        await wait(retryAfter);
        return fetchDMMessages(userId, messageCount, retryCount + 1);
      }
      throw error;
    }
  } catch (error) {
    logError('fetchDMMessages', error);
    throw error;
  }
}