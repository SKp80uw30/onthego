import { createClient } from '@supabase/supabase-js';
import { openDMChannel, sendDMMessage, fetchDMHistory } from './dm-api';

interface DMRequest {
  slackAccountId: string;
  userIdentifier: string;
  message?: string;
  messageCount?: number;
}

export async function handleSendDM(supabase: any, { slackAccountId, userIdentifier, message }: DMRequest) {
  console.log('Processing send DM request:', { slackAccountId, userIdentifier });

  // Get Slack account details
  const { data: slackAccount, error: accountError } = await supabase
    .from('slack_accounts')
    .select('*')
    .eq('id', slackAccountId)
    .single();

  if (accountError || !slackAccount?.slack_bot_token) {
    console.error('Error fetching Slack account:', accountError);
    throw new Error('Failed to get Slack account details');
  }

  // Find the DM user
  const { data: dmUser, error: dmUserError } = await supabase
    .from('slack_dm_users')
    .select('*')
    .eq('slack_account_id', slackAccountId)
    .eq('is_active', true)
    .or(`display_name.ilike.${userIdentifier},email.ilike.${userIdentifier}`)
    .single();

  if (dmUserError || !dmUser) {
    console.error('Error finding DM user:', dmUserError);
    throw new Error(`No matching user found for "${userIdentifier}"`);
  }

  // Open DM channel and send message
  const channelId = await openDMChannel(slackAccount.slack_bot_token, dmUser.slack_user_id);
  await sendDMMessage(slackAccount.slack_bot_token, channelId, message as string);

  return { success: true, message: 'DM sent successfully' };
}

export async function handleFetchDMs(supabase: any, { slackAccountId, userIdentifier, messageCount = 10 }: DMRequest) {
  console.log('Processing fetch DMs request:', { slackAccountId, userIdentifier, messageCount });

  // Get Slack account details
  const { data: slackAccount, error: accountError } = await supabase
    .from('slack_accounts')
    .select('*')
    .eq('id', slackAccountId)
    .single();

  if (accountError || !slackAccount?.slack_bot_token) {
    console.error('Error fetching Slack account:', accountError);
    throw new Error('Failed to get Slack account details');
  }

  // Find the DM user
  const { data: dmUser, error: dmUserError } = await supabase
    .from('slack_dm_users')
    .select('*')
    .eq('slack_account_id', slackAccountId)
    .eq('is_active', true)
    .or(`display_name.ilike.${userIdentifier},email.ilike.${userIdentifier}`)
    .single();

  if (dmUserError || !dmUser) {
    console.error('Error finding DM user:', dmUserError);
    throw new Error(`No matching user found for "${userIdentifier}"`);
  }

  // Open DM channel and fetch history
  const channelId = await openDMChannel(slackAccount.slack_bot_token, dmUser.slack_user_id);
  const messages = await fetchDMHistory(slackAccount.slack_bot_token, channelId, messageCount);

  return { success: true, messages };
}