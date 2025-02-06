import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export async function getSlackAccount(slackAccountId: string) {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

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