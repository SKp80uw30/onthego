import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { logError, logInfo } from './logging.ts';

export async function getSlackAccount(supabase: any) {
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

export async function findDMUser(supabase: any, slackAccountId: string, userIdentifier: string) {
  try {
    logInfo('findDMUser', `Looking up DM user with identifier: ${userIdentifier}`);
    
    const { data: dmUsers, error } = await supabase
      .from('slack_dm_users')
      .select('*')
      .eq('slack_account_id', slackAccountId)
      .eq('is_active', true);

    if (error) {
      logError('findDMUser', 'Error querying DM users', error);
      throw new Error(`Failed to query DM users: ${error.message}`);
    }

    const normalizedIdentifier = userIdentifier.toLowerCase().trim();
    const user = dmUsers.find(u => 
      (u.display_name && u.display_name.toLowerCase() === normalizedIdentifier) ||
      (u.email && u.email.toLowerCase() === normalizedIdentifier)
    );

    if (!user) {
      throw new Error(`No matching user found for "${userIdentifier}"`);
    }

    logInfo('findDMUser', `Found matching user: ${user.display_name || user.email}`);
    return user;
  } catch (error) {
    logError('findDMUser', error);
    throw error;
  }
}

export async function openDMChannel(token: string, userId: string) {
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
    
    if (!data.ok) {
      logError('openDMChannel', 'Failed to open DM channel', {
        error: data.error,
        details: data
      });
      throw new Error(`Failed to open DM channel: ${data.error}`);
    }

    logInfo('openDMChannel', 'Successfully opened DM channel', {
      channelId: data.channel.id
    });
    
    return data.channel;
  } catch (error) {
    logError('openDMChannel', error);
    throw error;
  }
}

export async function verifyBotPermissions(token: string) {
  try {
    logInfo('verifyBotPermissions', 'Testing bot permissions');
    
    const response = await fetch('https://slack.com/api/auth.test', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });

    const data = await response.json();
    
    if (!data.ok) {
      logError('verifyBotPermissions', 'Bot permissions test failed', {
        error: data.error,
        details: data
      });
      throw new Error(`Bot permissions test failed: ${data.error}`);
    }

    logInfo('verifyBotPermissions', 'Bot permissions verified', {
      botId: data.bot_id,
      userId: data.user_id,
      teamId: data.team_id
    });

    return data;
  } catch (error) {
    logError('verifyBotPermissions', error);
    throw error;
  }
}

export async function sendMessage(token: string, channelId: string, message: string) {
  try {
    logInfo('sendMessage', 'Starting message send process', { 
      channelId,
      messageLength: message.length
    });

    // First verify bot permissions
    await verifyBotPermissions(token);

    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel: channelId,
        text: message,
        as_user: true
      })
    });

    const data = await response.json();
    
    if (!data.ok) {
      logError('sendMessage', 'Failed to send message', {
        error: data.error,
        details: data
      });
      throw new Error(`Failed to send message: ${data.error}`);
    }

    // Verify the message was actually sent by checking channel history
    const verifyResponse = await fetch(`https://slack.com/api/conversations.history?channel=${channelId}&limit=1`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    });

    const verifyData = await verifyResponse.json();
    
    if (!verifyData.ok || !verifyData.messages?.length) {
      logError('sendMessage', 'Message verification failed', {
        error: verifyData.error,
        details: verifyData
      });
      throw new Error('Message sent but not found in channel history');
    }

    logInfo('sendMessage', 'Message successfully sent and verified', {
      messageTs: data.ts,
      channelId: data.channel
    });

    return data;
  } catch (error) {
    logError('sendMessage', error);
    throw error;
  }
}