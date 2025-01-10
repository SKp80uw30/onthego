import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the request parameters
    const { slackAccountId } = await req.json();
    
    console.log('Fetching channels for workspace...');

    // Get all slack accounts (we'll use the first active one if specific ID not found)
    const { data: slackAccounts, error: slackError } = await supabaseClient
      .from('slack_accounts')
      .select('slack_bot_token, slack_workspace_name')
      .order('created_at', { ascending: false })
      .limit(1);

    if (slackError) {
      console.error('Error fetching slack accounts:', slackError);
      throw new Error('Error fetching Slack accounts');
    }

    if (!slackAccounts || slackAccounts.length === 0) {
      console.log('No Slack workspaces connected');
      return new Response(JSON.stringify({ channels: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const slackAccount = slackAccounts[0];
    console.log('Found workspace:', slackAccount.slack_workspace_name);

    // First, let's check the bot token's scopes
    const authTest = await fetch('https://slack.com/api/auth.test', {
      headers: {
        'Authorization': `Bearer ${slackAccount.slack_bot_token}`,
        'Content-Type': 'application/json',
      },
    });

    const authData = await authTest.json();
    console.log('Auth test response:', {
      ok: authData.ok,
      error: authData.error,
      scopes: authData.scopes
    });

    if (!authData.ok) {
      console.error('Auth test failed:', authData.error);
      throw new Error(`Auth test failed: ${authData.error}`);
    }

    // Call Slack API to get the list of channels
    const response = await fetch('https://slack.com/api/conversations.list?types=public_channel,private_channel,mpim', {
      headers: {
        'Authorization': `Bearer ${slackAccount.slack_bot_token}`,
        'Content-Type': 'application/json',
      },
    });

    const channelsData = await response.json();
    
    console.log('Slack API response:', {
      ok: channelsData.ok,
      channelCount: channelsData.channels?.length,
      error: channelsData.error,
      needed: channelsData.needed, // This will show which scope is missing
      provided: channelsData.provided // This will show what scopes we have
    });
    
    if (!channelsData.ok) {
      console.error('Error from Slack API:', {
        error: channelsData.error,
        needed: channelsData.needed,
        provided: channelsData.provided
      });
      throw new Error(channelsData.error);
    }

    // Filter to only get channels where the bot is a member
    const botChannels = channelsData.channels
      .filter((channel: any) => channel.is_member)
      .map((channel: any) => channel.name);

    console.log('Bot is member of channels:', botChannels);

    return new Response(JSON.stringify({ channels: botChannels }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in fetch-slack-channels:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});