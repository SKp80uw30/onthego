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
    const channel = await openDMChannel(slackAccount.slack_bot_token, userId);

    logInfo('sendDMMessage', {
      userId,
      message,
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
    logError('sendDMMessage', error);
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
    const { userId, message } = await req.json();
    await sendDMMessage(userId, message);
    
    return new Response(
      JSON.stringify({ success: true }),
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