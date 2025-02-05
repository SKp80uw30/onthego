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
    const channel = await openDMChannel(slackAccount.slack_bot_token, userId);

    logInfo('fetchDMMessages', {
      userId,
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
    logError('fetchDMMessages', error);
    throw error;
  }
}

async function openDMChannel(token: string, userId: string) {
  const response = await callSlackApi(
    'conversations.open',
    token,
    'POST',
    {
      users: userId,
    }
  );

  return response.channel;
}

// Handle incoming requests
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, messageCount } = await req.json();
    const messages = await fetchDMMessages(userId, messageCount);
    
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