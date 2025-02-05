import { corsHeaders } from '../../_shared/cors.ts';
import { logError, logInfo } from '../../_shared/logging.ts';
import { getSlackAccount } from '../common/auth.ts';
import { callSlackApi } from '../common/api.ts';

export async function sendChannelMessage(
  channelName: string,
  message: string
): Promise<void> {
  try {
    const slackAccount = await getSlackAccount();
    const channel = await getSlackChannel(slackAccount.slack_bot_token, channelName);

    logInfo('sendChannelMessage', {
      channelName,
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
    logError('sendChannelMessage', error);
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
    const { channelName, message } = await req.json();
    await sendChannelMessage(channelName, message);
    
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