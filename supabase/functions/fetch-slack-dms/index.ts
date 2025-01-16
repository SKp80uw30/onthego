import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const RETRY_AFTER_DEFAULT = 30;
const MAX_RETRIES = 3;

async function wait(seconds: number) {
  return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

async function fetchSlackUsers(botToken: string, retryCount = 0): Promise<any> {
  try {
    console.log('Fetching users from Slack API...');
    const response = await fetch('https://slack.com/api/users.list', {
      headers: {
        'Authorization': `Bearer ${botToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 429 && retryCount < MAX_RETRIES) {
      const retryAfter = parseInt(response.headers.get('Retry-After') || String(RETRY_AFTER_DEFAULT));
      console.log(`Rate limited. Waiting ${retryAfter} seconds before retry ${retryCount + 1}/${MAX_RETRIES}`);
      await wait(retryAfter);
      return fetchSlackUsers(botToken, retryCount + 1);
    }

    const data = await response.json();
    if (!data.ok) {
      console.error('Slack API error:', data.error);
      throw new Error(`Slack API error: ${data.error}`);
    }

    return data;
  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      console.log(`Error occurred, retrying (${retryCount + 1}/${MAX_RETRIES})`);
      await wait(Math.pow(2, retryCount));
      return fetchSlackUsers(botToken, retryCount + 1);
    }
    throw error;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { slackAccountId } = await req.json()
    console.log('Starting fetch-slack-dms for account:', slackAccountId)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Supabase client initialized with URL:', Deno.env.get('SUPABASE_URL'));

    const { data: slackAccount, error: accountError } = await supabase
      .from('slack_accounts')
      .select('slack_bot_token, slack_workspace_name')
      .eq('id', slackAccountId)
      .single()

    if (accountError) {
      console.error('Error fetching Slack account:', accountError)
      throw new Error(`Failed to get Slack account: ${accountError.message}`)
    }

    if (!slackAccount?.slack_bot_token) {
      console.error('No bot token found for account:', slackAccountId)
      throw new Error('No Slack bot token found')
    }

    console.log(`Fetching users for workspace: ${slackAccount.slack_workspace_name}`)

    const data = await fetchSlackUsers(slackAccount.slack_bot_token);
    console.log(`Found ${data.members.length} total Slack users`);

    if (data.members.length > 0) {
      console.log('Sample raw user data:', JSON.stringify(data.members[0], null, 2));
    }

    const users = data.members
      .filter((member: any) => !member.is_bot && !member.deleted && !member.is_restricted)
      .map((member: any) => ({
        slack_account_id: slackAccountId,
        slack_user_id: member.id,
        display_name: member.profile.display_name || member.profile.real_name || member.name,
        email: member.profile.email,
        is_active: true,
        last_fetched: new Date().toISOString(),
        error_log: null // Clear any previous error logs for active users
      }));

    console.log(`Processing ${users.length} active human users`);
    console.log('Processed users data:', JSON.stringify(users, null, 2));

    // First, mark all existing users as inactive
    const { error: deactivateAllError } = await supabase
      .from('slack_dm_users')
      .update({ 
        is_active: false,
        error_log: 'User not found in latest fetch',
        last_fetched: new Date().toISOString()
      })
      .eq('slack_account_id', slackAccountId);

    if (deactivateAllError) {
      console.error('Error deactivating all users:', deactivateAllError);
      console.error('Deactivation error details:', JSON.stringify(deactivateAllError, null, 2));
    }

    // Then upsert the current users
    const { data: upsertData, error: upsertError } = await supabase
      .from('slack_dm_users')
      .upsert(users, {
        onConflict: 'slack_account_id,slack_user_id',
        returning: 'minimal'
      });

    if (upsertError) {
      console.error('Error upserting users:', upsertError);
      console.error('Error details:', JSON.stringify(upsertError, null, 2));
      throw new Error(`Failed to update DM users: ${upsertError.message}`);
    }

    console.log('Upsert response:', JSON.stringify(upsertData, null, 2));

    // Verify the stored data
    const { data: storedUsers, error: fetchError } = await supabase
      .from('slack_dm_users')
      .select('*')
      .eq('slack_account_id', slackAccountId)
      .eq('is_active', true);

    if (fetchError) {
      console.error('Error fetching stored users:', fetchError);
      console.error('Error details:', JSON.stringify(fetchError, null, 2));
    } else {
      console.log('Stored active users:', JSON.stringify(storedUsers, null, 2));
    }

    console.log('Successfully processed all DM users');

    return new Response(
      JSON.stringify({ 
        success: true, 
        count: users.length,
        workspace: slackAccount.slack_workspace_name 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in fetch-slack-dms:', error);
    console.error('Full error details:', JSON.stringify(error, null, 2));
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack
      }),
      { 
        status: error.status || 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});