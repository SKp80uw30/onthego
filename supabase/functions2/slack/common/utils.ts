
import { logError, logInfo } from '../../_shared/logging.ts';

export async function verifyToken(token: string) {
  try {
    logInfo('verifyToken', 'Verifying Slack token and permissions');
    
    const response = await fetch('https://slack.com/api/auth.test', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    
    if (!data.ok) {
      logError('verifyToken', 'Token verification failed', {
        error: data.error,
        details: data
      });
      throw new Error(`Token verification failed: ${data.error}`);
    }

    logInfo('verifyToken', 'Token verified successfully', {
      userId: data.user_id,
      teamId: data.team_id,
      scope: data.scope
    });
    
    return data;
  } catch (error) {
    logError('verifyToken', error);
    throw error;
  }
}

export async function findDMUser(supabase: any, slackAccountId: string, userIdentifier: string) {
  try {
    logInfo('findDMUser', 'Looking up DM user', { 
      slackAccountId,
      userIdentifier 
    });
    
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
      logError('findDMUser', 'No matching user found', {
        userIdentifier,
        availableUsers: dmUsers.map(u => ({
          display_name: u.display_name,
          email: u.email
        }))
      });
      throw new Error(`No matching user found for "${userIdentifier}"`);
    }

    logInfo('findDMUser', 'Found matching user', {
      userId: user.slack_user_id,
      displayName: user.display_name,
      email: user.email
    });
    
    return user;
  } catch (error) {
    logError('findDMUser', error);
    throw error;
  }
}

export async function openDMChannel(token: string, userId: string) {
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
    
    if (!data.ok) {
      logError('openDMChannel', 'Failed to open DM channel', {
        error: data.error,
        warning: data.warning,
        details: data,
        userId
      });
      throw new Error(`Failed to open DM channel: ${data.error}`);
    }

    if (!data.channel?.id) {
      logError('openDMChannel', 'No channel ID in response', {
        response: data
      });
      throw new Error('No channel ID returned from Slack');
    }

    logInfo('openDMChannel', 'Successfully opened DM channel', {
      channelId: data.channel.id,
      isIM: data.channel.is_im,
      userId: data.channel.user
    });
    
    return data.channel;
  } catch (error) {
    logError('openDMChannel', error);
    throw error;
  }
}

export async function sendMessage(token: string, channelId: string, message: string) {
  try {
    logInfo('sendMessage', 'Preparing to send message', { 
      channelId,
      messageLength: message.length,
      tokenPrefix: token.substring(0, 10) + '...'
    });

    // Validate channel ID before attempting to send
    if (!channelId) {
      throw new Error('Invalid channel ID provided');
    }

    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel: channelId,
        text: message
      })
    });

    const data = await response.json();
    
    if (!data.ok) {
      logError('sendMessage', 'Failed to send message', {
        error: data.error,
        warning: data.warning,
        details: data,
        channelId
      });
      throw new Error(`Failed to send message: ${data.error}`);
    }

    logInfo('sendMessage', 'Message successfully sent', {
      messageTs: data.ts,
      channelId: data.channel,
      threadTs: data.thread_ts,
      responseMetadata: data.response_metadata
    });

    return data;
  } catch (error) {
    logError('sendMessage', error);
    throw error;
  }
}
