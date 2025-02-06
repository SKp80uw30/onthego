import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export async function getSlackAccount() {
  console.log('Starting database query for Slack account');
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const { data: slackAccount, error: accountError } = await supabase
    .from('slack_accounts')
    .select('*')
    .limit(1)
    .single();

  console.log('Slack account query results:', {
    success: !accountError,
    hasToken: !!slackAccount?.slack_bot_token,
    workspaceName: slackAccount?.slack_workspace_name,
    workspaceId: slackAccount?.slack_workspace_id,
    error: accountError
  });

  if (accountError || !slackAccount?.slack_bot_token) {
    console.error('Error fetching Slack account:', accountError);
    throw new Error('Failed to get Slack account');
  }

  return slackAccount;
}