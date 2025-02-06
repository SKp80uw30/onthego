import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { logError, logInfo } from './logging.ts';

export async function getSlackAccount(supabase: any) {
  logInfo('getSlackAccount', 'Fetching Slack account...');
  
  const { data: slackAccount, error: accountError } = await supabase
    .from('slack_accounts')
    .select('*')
    .limit(1)
    .single();

  if (accountError || !slackAccount?.slack_bot_token) {
    logError('getSlackAccount', 'Failed to get Slack account details', accountError);
    throw new Error('Failed to get Slack account details');
  }

  logInfo('getSlackAccount', `Successfully retrieved Slack account with workspace: ${slackAccount.slack_workspace_name}`);
  return slackAccount;
}

export async function findDMUser(supabase: any, slackAccountId: string, userIdentifier: string) {
  logInfo('findDMUser', `Looking up DM user with identifier: ${userIdentifier}`);
  
  if (!userIdentifier) {
    throw new Error('User identifier is required');
  }

  const { data: dmUsers, error } = await supabase
    .from('slack_dm_users')
    .select('*')
    .eq('slack_account_id', slackAccountId)
    .eq('is_active', true);

  if (error) {
    logError('findDMUser', 'Error querying DM users', error);
    throw new Error(`Failed to query DM users: ${error.message}`);
  }

  logInfo('findDMUser', `Found ${dmUsers.length} active DM users`);

  const normalizedIdentifier = userIdentifier.toLowerCase().trim();
  const user = dmUsers.find(u => 
    (u.display_name && u.display_name.toLowerCase() === normalizedIdentifier) ||
    (u.email && u.email.toLowerCase() === normalizedIdentifier)
  );

  if (!user) {
    throw new Error(`No matching user found for "${userIdentifier}". Available users: ${dmUsers.map(u => u.display_name || u.email).join(', ')}`);
  }

  logInfo('findDMUser', `Found matching user: ${user.display_name || user.email}`);
  return user;
}

export async function openDMChannel(token: string, userId: string) {
  logInfo('openDMChannel', `Opening DM channel with user: ${userId}`);
  
  const response = await fetch('https://slack.com/api/conversations.open', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ users: userId })
  });

  const data = await response.json();
  if (!data.ok || !data.channel) {
    logError('openDMChannel', 'Failed to open DM channel', data.error);
    throw new Error('Failed to open DM channel');
  }

  logInfo('openDMChannel', `Successfully opened DM channel: ${data.channel.id}`);
  return data.channel;
}

export async function sendMessage(token: string, channelId: string, message: string) {
  logInfo('sendMessage', `Sending message to channel: ${channelId}`);
  
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
  if (!data.ok) {
    logError('sendMessage', 'Failed to send message', data.error);
    throw new Error('Failed to send message');
  }

  logInfo('sendMessage', 'Message sent successfully');
  return data;
}