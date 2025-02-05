import { corsHeaders } from '../../_shared/cors.ts';
import { logError, logInfo } from '../../_shared/logging.ts';
import { getSlackAccount } from '../common/auth.ts';
import { callSlackApi } from '../common/api.ts';
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
      messageCount,
    });

    const response = await callSlackApi(
      'conversations.history',
      slackAccount.slack_bot_token,
      'GET',
      {
        channel: channel.id,
        limit: messageCount,
      }
    );

    return response.messages;
  } catch (error) {
    logError('fetchChannelMessages', error);
    throw error;
  }
}

async function getSlackChannel(token: string, channelName: string) {
  const response = await callSlackApi(
    'conversations.list',
    token,
    'GET',
    {
      types: 'public_channel,private_channel',
    }
  );

  const channel = response.channels.find((c: any) => c.name === channelName);
  if (!channel) {
    throw new Error(`Channel ${channelName} not found`);
  }

  return channel;
}

// Handle incoming requests
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { channelName, messageCount } = await req.json();
    const messages = await fetchChannelMessages(channelName, messageCount);
    
    return new Response(
      JSON.stringify({ messages }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});