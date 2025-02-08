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
      responseStatus: response.status,
      headers: Object.fromEntries(response.headers)
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
      isBot: user.is_bot,
      teamId: user.team_id
    });

    return user;
  } catch (error) {
    logError('lookupSlackUser', error);
    throw error;
  }
}

async function openDMChannel(token: string, userId: string) {
  try {
    logInfo('openDMChannel', 'Opening DM channel', { 
      userId,
      tokenPrefix: token.substring(0, 10) + '...'
    });
    
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
      responseHeaders: Object.fromEntries(response.headers),
      responseBody: data,
      requestBody: { users: userId }
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
    logInfo('sendMessage', 'Starting message send process', { 
      channelId,
      messageLength: message.length,
      tokenPrefix: token.substring(0, 10) + '...'
    });
    
    // First verify bot permissions
    logInfo('sendMessage', 'Performing auth test');
    const authTestResponse = await fetch('https://slack.com/api/auth.test', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });
    
    const authData = await authTestResponse.json();
    logInfo('sendMessage', 'Auth test raw response', authData);
    logInfo('sendMessage', 'Auth test details', {
      ok: authData.ok,
      botId: authData.bot_id,
      userId: authData.user_id,
      teamId: authData.team_id,
      error: authData.error,
      scopes: authData.scopes
    });

    if (!authData.ok) {
      throw new Error(`Auth test failed: ${authData.error}`);
    }

    const requestBody = {
      channel: channelId,
      text: message,
      as_user: true
    };

    logInfo('sendMessage', 'Sending message with body', requestBody);

    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();
    logInfo('sendMessage', 'chat.postMessage raw response', data);
    logInfo('sendMessage', 'Message send details', { 
      ok: data.ok,
      ts: data.ts,
      channel: data.channel,
      error: data.error,
      warning: data.warning,
      responseStatus: response.status
    });

    if (!data.ok) {
      throw new Error(`Failed to send message: ${data.error}`);
    }

    // Verify the message was actually sent
    logInfo('sendMessage', 'Verifying message delivery');
    const verifyResponse = await fetch(`https://slack.com/api/conversations.history?channel=${channelId}&limit=1`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });

    const verifyData = await verifyResponse.json();
    logInfo('sendMessage', 'Verification raw response', verifyData);
    logInfo('sendMessage', 'Verification details', {
      ok: verifyData.ok,
      hasMessages: verifyData.messages?.length > 0,
      latestMessage: verifyData.messages?.[0]?.text,
      error: verifyData.error
    });

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
    const body = await req.json();
    logInfo('handler', 'Received request:', body);

    const toolCall = body.message?.toolCalls?.[0];
    if (!toolCall?.function?.name || !toolCall?.function?.arguments) {
      throw new Error('Invalid tool request structure');
    }

    // Parse arguments, handling both string and object formats
    const args = typeof toolCall.function.arguments === 'string' 
      ? JSON.parse(toolCall.function.arguments)
      : toolCall.function.arguments;

    logInfo('handler', 'Parsed tool arguments:', args);

    // Validate required parameters
    if (!args.userIdentifier || !args.Message) {
      throw new Error('Missing required parameters: userIdentifier and Message');
    }

    // Check message approval
    if (!args.Send_message_approval) {
      return new Response(
        JSON.stringify({
          results: [{
            toolCallId: toolCall.id,
            result: "Message not approved for sending"
          }]
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get Slack account and validate bot token
    const slackAccount = await getSlackAccount(supabase);
    
    // Lookup Slack user
    const slackUser = await lookupSlackUser(slackAccount.slack_bot_token, args.userIdentifier);
    
    // Open DM channel
    const channel = await openDMChannel(slackAccount.slack_bot_token, slackUser.id);
    
    // Send message
    await sendMessage(slackAccount.slack_bot_token, channel.id, args.Message);

    logInfo('handler', 'Successfully completed DM flow');

    return new Response(
      JSON.stringify({
        results: [{
          toolCallId: toolCall.id,
          result: `Message sent successfully to ${slackUser.display_name || slackUser.email}`
        }]
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    logError('handler', 'Error in send-slack-dm function:', error);
    
    return new Response(
      JSON.stringify({
        results: [{
          toolCallId: body?.message?.toolCalls?.[0]?.id || 'unknown_call_id',
          result: `Error: ${error.message}`
        }]
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
