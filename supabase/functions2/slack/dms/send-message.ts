import { corsHeaders } from '../../_shared/cors.ts';
import { logError, logInfo } from '../../_shared/logging.ts';
import { getSlackAccount } from '../common/auth.ts';
import { callSlackApi } from '../common/api.ts';

export async function sendDMMessage(userId: string, message: string): Promise<void> {
  try {
    const slackAccount = await getSlackAccount();
    const channel = await openDMChannel(slackAccount.slack_bot_token, userId);

    logInfo('sendDMMessage', 'Sending DM', {
      userId,
      messageLength: message.length,
      channelId: channel.id
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
    logError('sendDMMessage', error instanceof Error ? error : new Error(String(error)));
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
    
    logInfo('send-slack-dm', 'Processing request', {
      userId,
      messageLength: message?.length
    });

    if (!userId || !message) {
      throw new Error('Missing required parameters: userId and message are required');
    }

    await sendDMMessage(userId, message);
    
    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    logError('send-slack-dm', error instanceof Error ? error : new Error(String(error)));
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : String(error),
        success: false 
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});