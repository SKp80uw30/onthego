import { corsHeaders } from '../../_shared/cors.ts';
import { logError, logInfo } from '../../_shared/logging.ts';
import { getSlackAccount } from '../common/auth.ts';
import { getSlackChannel, callSlackApi } from '../common/api.ts';
import type { SlackMessage } from '../common/types.ts';

export async function fetchChannelMessages(
  channelName: string,
  messageCount: number = 5
): Promise<SlackMessage[]> {
  try {
    const slackAccount = await getSlackAccount();
    const channel = await getSlackChannel(slackAccount.slack_bot_token, channelName);
    
    logInfo('fetchChannelMessages', {
      channelName,
      channelId: channel.id,
      requestedCount: messageCount
    });

    const result = await callSlackApi(
      `conversations.history?channel=${channel.id}&limit=${messageCount}`,
      slackAccount.slack_bot_token
    );

    if (!result.ok) {
      throw new Error(`Failed to fetch messages: ${result.error}`);
    }

    return result.messages;
  } catch (error) {
    logError('fetchChannelMessages', error);
    throw error;
  }
}