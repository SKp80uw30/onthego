import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { logError, logInfo } from '../../_shared/logging.ts';
import { callSlackApi } from '../common/api.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function getSlackAccount(supabase: any) {
  try {
    logInfo('getSlackAccount', 'Fetching Slack account from database');
    const { data, error } = await supabase
      .from('slack_accounts')
      .select('*')
      .limit(1)
      .single();

    if (error) throw error;
    if (!data) throw new Error('No Slack account found');

    logInfo('getSlackAccount', 'Successfully retrieved Slack account', {
      hasToken: !!data.slack_bot_token,
      workspaceName: data.slack_workspace_name
    });

    return data;
  } catch (error) {
    logError('getSlackAccount', error);
    throw error;
  }
}

async function lookupSlackUser(token: string, userIdentifier: string) {
  try {
    logInfo('lookupSlackUser', `Looking up user by identifier: ${userIdentifier}`);
    
    // First try to lookup by email if the identifier looks like an email
    if (userIdentifier.includes('@')) {
      const response = await callSlackApi(
        'users.lookupByEmail',
        token,
        'GET',
        { email: userIdentifier }
      );
      if (response.ok && response.user) {
        return response.user;
      }
    }

    // If not found by email, try users.list with a search
    const response = await callSlackApi(
      'users.list',
      token,
      'GET',
      {}
    );

    if (!response.ok || !response.members) {
      throw new Error('Failed to fetch users list');
    }

    const user = response.members.find((member: any) => 
      member.profile.display_name === userIdentifier ||
      member.profile.real_name === userIdentifier ||
      member.name === userIdentifier
    );

    if (!user) {
      throw new Error(`No matching user found for "${userIdentifier}"`);
    }

    return user;
  } catch (error) {
    logError('lookupSlackUser', error);
    throw error;
  }
}

async function openDMChannel(token: string, userId: string) {
  try {
    logInfo('openDMChannel', `Opening DM channel with user: ${userId}`);
    const response = await callSlackApi(
      'conversations.open',
      token,
      'POST',
      { users: userId }
    );

    if (!response.ok || !response.channel) {
      throw new Error('Failed to open DM channel');
    }

    return response.channel;
  } catch (error) {
    logError('openDMChannel', error);
    throw error;
  }
}

async function sendMessage(token: string, channelId: string, message: string) {
  try {
    logInfo('sendMessage', `Sending message to channel: ${channelId}`);
    const response = await callSlackApi(
      'chat.postMessage',
      token,
      'POST',
      {
        channel: channelId,
        text: message,
      }
    );

    if (!response.ok) {
      throw new Error('Failed to send message');
    }

    return response;
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
    
    logInfo('send-slack-dm', 'Processing request', {
      userIdentifier,
      messageLength: message?.length
    });

    if (!userIdentifier || !message) {
      throw new Error('Missing required parameters: userIdentifier and message are required');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Get Slack account and validate bot token
    const slackAccount = await getSlackAccount(supabase);
    
    // 2. Lookup Slack user
    const slackUser = await lookupSlackUser(slackAccount.slack_bot_token, userIdentifier);
    
    // 3. Open DM channel
    const channel = await openDMChannel(slackAccount.slack_bot_token, slackUser.id);
    
    // 4. Send message
    await sendMessage(slackAccount.slack_bot_token, channel.id, message);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Message sent to ${slackUser.profile.display_name || slackUser.name}`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    logError('send-slack-dm', error);
    
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