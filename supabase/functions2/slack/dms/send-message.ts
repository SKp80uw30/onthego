import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { logError, logInfo } from '../../_shared/logging.ts';
import { callSlackApi } from '../common/api.ts';

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
      workspaceName: data.slack_workspace_name
    });

    return data;
  } catch (error) {
    logError('getSlackAccount', error, {
      error_type: error.constructor.name,
      error_stack: error.stack
    });
    throw error;
  }
}

async function lookupSlackUser(token: string, userIdentifier: string) {
  try {
    logInfo('lookupSlackUser', 'Starting user lookup', { 
      userIdentifier,
      isEmail: userIdentifier.includes('@')
    });
    
    // First try to lookup by email if the identifier looks like an email
    if (userIdentifier.includes('@')) {
      logInfo('lookupSlackUser', 'Attempting email lookup', { email: userIdentifier });
      try {
        const response = await callSlackApi(
          'users.lookupByEmail',
          token,
          'GET',
          { email: userIdentifier }
        );
        if (response.ok && response.user) {
          logInfo('lookupSlackUser', 'Successfully found user by email', {
            userId: response.user.id,
            userName: response.user.name,
            isBot: response.user.is_bot
          });
          return response.user;
        }
      } catch (emailError) {
        logError('lookupSlackUser', 'Email lookup failed', { 
          error: emailError,
          email: userIdentifier 
        });
      }
    }

    // If not found by email, try users.list with a search
    logInfo('lookupSlackUser', 'Attempting users.list lookup');
    const response = await callSlackApi(
      'users.list',
      token,
      'GET',
      {}
    );

    if (!response.ok || !response.members) {
      logError('lookupSlackUser', 'Failed to fetch users list', { 
        responseOk: response.ok,
        hasMembers: !!response.members,
        error: response.error 
      });
      throw new Error('Failed to fetch users list');
    }

    logInfo('lookupSlackUser', 'Retrieved users list', { 
      totalUsers: response.members.length 
    });

    const user = response.members.find((member: any) => {
      const matches = 
        member.profile.display_name === userIdentifier ||
        member.profile.real_name === userIdentifier ||
        member.name === userIdentifier;
      
      if (matches) {
        logInfo('lookupSlackUser', 'Found matching user in list', {
          userId: member.id,
          displayName: member.profile.display_name,
          realName: member.profile.real_name,
          userName: member.name
        });
      }
      return matches;
    });

    if (!user) {
      logError('lookupSlackUser', 'No matching user found', { 
        searchedIdentifier: userIdentifier,
        availableUsers: response.members.map((m: any) => ({
          id: m.id,
          display_name: m.profile.display_name,
          real_name: m.profile.real_name,
          name: m.name
        }))
      });
      throw new Error(`No matching user found for "${userIdentifier}"`);
    }

    return user;
  } catch (error) {
    logError('lookupSlackUser', error, {
      userIdentifier,
      error_type: error.constructor.name,
      error_stack: error.stack
    });
    throw error;
  }
}

async function openDMChannel(token: string, userId: string) {
  try {
    logInfo('openDMChannel', 'Opening DM channel', { userId });
    const response = await callSlackApi(
      'conversations.open',
      token,
      'POST',
      { users: userId }
    );

    if (!response.ok || !response.channel) {
      logError('openDMChannel', 'Failed to open DM channel', { 
        responseOk: response.ok,
        hasChannel: !!response.channel,
        error: response.error,
        userId 
      });
      throw new Error('Failed to open DM channel');
    }

    logInfo('openDMChannel', 'Successfully opened DM channel', {
      channelId: response.channel.id,
      userId
    });

    return response.channel;
  } catch (error) {
    logError('openDMChannel', error, {
      userId,
      error_type: error.constructor.name,
      error_stack: error.stack
    });
    throw error;
  }
}

async function sendMessage(token: string, channelId: string, message: string) {
  try {
    logInfo('sendMessage', 'Sending message', { 
      channelId,
      messageLength: message.length 
    });
    
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
      logError('sendMessage', 'Failed to send message', { 
        responseOk: response.ok,
        error: response.error,
        channelId 
      });
      throw new Error('Failed to send message');
    }

    logInfo('sendMessage', 'Successfully sent message', {
      channelId,
      messageTs: response.ts,
      threadTs: response.thread_ts
    });

    return response;
  } catch (error) {
    logError('sendMessage', error, {
      channelId,
      error_type: error.constructor.name,
      error_stack: error.stack
    });
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
      messageLength: message?.length,
      requestMethod: req.method,
      headers: Object.fromEntries(req.headers)
    });

    if (!userIdentifier || !message) {
      const error = 'Missing required parameters';
      logError('send-slack-dm', error, { 
        hasUserIdentifier: !!userIdentifier,
        hasMessage: !!message 
      });
      throw new Error(error);
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

    logInfo('send-slack-dm', 'Successfully completed DM flow', {
      userIdentifier,
      userId: slackUser.id,
      channelId: channel.id
    });

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
    logError('send-slack-dm', error, {
      error_type: error.constructor.name,
      error_stack: error.stack
    });
    
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