import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { logError, logInfo } from './logging.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function getSlackAccount(supabase: any) {
  try {
    logInfo('getSlackAccount', 'Starting Slack account fetch');
    const { data, error } = await supabase
      .from('slack_accounts')
      .select('*')
      .limit(1)
      .single();

    if (error) {
      logError('getSlackAccount', error, { error_details: error.details });
      throw error;
    }
    
    if (!data) {
      logError('getSlackAccount', 'No Slack account found', { data });
      throw new Error('No Slack account found');
    }

    logInfo('getSlackAccount', 'Successfully retrieved Slack account', {
      hasToken: !!data.slack_bot_token,
      workspaceId: data.slack_workspace_id,
      workspaceName: data.slack_workspace_name,
      tokenLength: data.slack_bot_token?.length
    });

    return data;
  } catch (error) {
    logError('getSlackAccount', error);
    throw error;
  }
}

async function lookupSlackUser(token: string, userIdentifier: string) {
  try {
    logInfo('lookupSlackUser', 'Starting user lookup', { userIdentifier });
    
    const response = await fetch('https://slack.com/api/users.list', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });

    const data = await response.json();
    logInfo('lookupSlackUser', 'Users list API response', { 
      ok: data.ok,
      memberCount: data.members?.length,
      error: data.error,
      responseStatus: response.status
    });

    if (!data.ok || !data.members) {
      throw new Error(`Failed to fetch users list: ${data.error}`);
    }

    const user = data.members.find((member: any) => 
      member.profile.display_name.toLowerCase() === userIdentifier.toLowerCase() ||
      member.real_name?.toLowerCase() === userIdentifier.toLowerCase() ||
      member.name.toLowerCase() === userIdentifier.toLowerCase()
    );

    if (!user) {
      throw new Error(`No matching user found for "${userIdentifier}"`);
    }

    logInfo('lookupSlackUser', 'Found matching user', {
      userId: user.id,
      displayName: user.profile.display_name,
      email: user.profile.email,
      isBot: user.is_bot
    });

    return user;
  } catch (error) {
    logError('lookupSlackUser', error);
    throw error;
  }
}

async function openDMChannel(token: string, userId: string) {
  try {
    logInfo('openDMChannel', 'Opening DM channel', { userId });
    
    const response = await fetch('https://slack.com/api/conversations.open', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ users: userId })
    });

    const data = await response.json();
    logInfo('openDMChannel', 'API response', { 
      ok: data.ok,
      channelId: data.channel?.id,
      error: data.error,
      responseStatus: response.status,
      responseBody: data
    });

    if (!data.ok) {
      throw new Error(`Failed to open DM channel: ${data.error}`);
    }

    return data.channel;
  } catch (error) {
    logError('openDMChannel', error);
    throw error;
  }
}

async function sendMessage(token: string, channelId: string, message: string) {
  try {
    logInfo('sendMessage', 'Sending message', { 
      channelId,
      messageLength: message.length,
      messagePreview: message.substring(0, 50)
    });
    
    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel: channelId,
        text: message,
      })
    });

    const data = await response.json();
    logInfo('sendMessage', 'API response', { 
      ok: data.ok,
      ts: data.ts,
      channel: data.channel,
      error: data.error,
      responseStatus: response.status,
      fullResponse: data,
      requestBody: {
        channel: channelId,
        text: message
      }
    });

    if (!data.ok) {
      throw new Error(`Failed to send message: ${data.error}`);
    }

    return data;
  } catch (error) {
    logError('sendMessage', error);
    throw error;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userIdentifier, message } = await req.json();
    
    logInfo('handler', 'Processing request', {
      userIdentifier,
      messageLength: message?.length,
      messagePreview: message?.substring(0, 50)
    });

    if (!userIdentifier || !message) {
      throw new Error('Missing required parameters');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const slackAccount = await getSlackAccount(supabase);
    const slackUser = await lookupSlackUser(slackAccount.slack_bot_token, userIdentifier);
    const channel = await openDMChannel(slackAccount.slack_bot_token, slackUser.id);
    const messageResponse = await sendMessage(slackAccount.slack_bot_token, channel.id, message);

    logInfo('handler', 'Successfully completed DM flow', {
      userIdentifier,
      userId: slackUser.id,
      channelId: channel.id,
      messageTs: messageResponse.ts,
      fullMessageResponse: messageResponse
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Message sent to ${slackUser.profile.display_name || slackUser.name}`,
        details: {
          channelId: channel.id,
          messageTs: messageResponse.ts
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    logError('handler', error);
    
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