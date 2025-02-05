import { corsHeaders } from '../../_shared/cors.ts';
import { logError, logInfo } from '../../_shared/logging.ts';
import { getSlackAccount } from '../common/auth.ts';
import { callSlackApi } from '../common/api.ts';
import type { SlackMessage } from '../common/types.ts';

export async function fetchDMMessages(
  userId: string,
  messageCount: number = 5
): Promise<SlackMessage[]> {
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

    logInfo('fetchDMMessages', {
      userId,
      channelId: channelResult.channel.id,
      requestedCount: messageCount
    });

    const result = await callSlackApi(
      `conversations.history?channel=${channelResult.channel.id}&limit=${messageCount}`,
      slackAccount.slack_bot_token
    );

    if (!result.ok) {
      throw new Error(`Failed to fetch messages: ${result.error}`);
    }

    return result.messages;
  } catch (error) {
    logError('fetchDMMessages', error);
    throw error;
  }
}