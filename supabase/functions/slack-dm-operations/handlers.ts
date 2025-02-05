import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { findUserByIdentifier, openDMChannel, sendDMMessage } from './dm-api.ts';

async function getSlackAccount(supabase, slackAccountId: string) {
  console.log('Fetching Slack account:', slackAccountId);
  
  const { data: slackAccount, error: accountError } = await supabase
    .from('slack_accounts')
    .select('slack_bot_token')
    .eq('id', slackAccountId)
    .single();

  if (accountError || !slackAccount?.slack_bot_token) {
    console.error('Error fetching Slack account:', accountError);
    throw new Error('Failed to get Slack account details');
  }

  return slackAccount;
}

export async function handleSendDM(slackAccountId: string, userIdentifier: string, message: string) {
  console.log('Processing DM request:', { slackAccountId, userIdentifier, message });
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  // Get Slack account details
  const slackAccount = await getSlackAccount(supabase, slackAccountId);
  
  // Find user's Slack ID
  const userId = await findUserByIdentifier(slackAccount.slack_bot_token, userIdentifier);
  
  // Open DM channel
  const channelId = await openDMChannel(slackAccount.slack_bot_token, userId);
  
  // Send the message
  const result = await sendDMMessage(slackAccount.slack_bot_token, channelId, message);
  
  return {
    success: true,
    message: `Message sent successfully to user ${userIdentifier}`,
    details: result
  };
}