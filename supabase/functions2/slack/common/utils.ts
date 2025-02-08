
import { logError, logInfo } from '../../_shared/logging.ts';

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

export async function sendMessage(token: string, channelId: string, message: string) {
  try {
    logInfo('sendMessage', 'Sending message to channel', { 
      channelId,
      messageLength: message.length
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

    logInfo('sendMessage', 'Message successfully sent', {
      messageTs: data.ts,
      channelId: data.channel
    });

    return data;
  } catch (error) {
    logError('sendMessage', error);
    throw error;
  }
}
