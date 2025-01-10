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
    
    console.log('Fetching channels for workspace ID:', slackAccountId);

    // Get the specific slack account
    const { data: slackAccount, error: slackError } = await supabaseClient
      .from('slack_accounts')
      .select('*')
      .eq('id', slackAccountId)
      .single();

    if (slackError) {
      console.error('Error fetching slack account:', slackError);
      throw new Error(`Error fetching Slack account: ${slackError.message}`);
    }

    if (!slackAccount) {
      console.log('No Slack account found for ID:', slackAccountId);
      return new Response(
        JSON.stringify({ 
          error: 'No Slack workspace connected',
          channels: [] 
        }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Found workspace:', slackAccount.slack_workspace_name);

    // First, let's check the bot token's validity
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
      team: authData.team
    });

    if (!authData.ok) {
      // If token is invalid, we should mark this account as needing reauthorization
      await supabaseClient
        .from('slack_accounts')
        .update({ needs_reauth: true })
        .eq('id', slackAccountId);

      return new Response(
        JSON.stringify({ 
          error: 'Slack workspace needs to be reconnected',
          errorType: 'reauthorization_needed',
          channels: [] 
        }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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
      error: channelsData.error
    });
    
    if (!channelsData.ok) {
      console.error('Error from Slack API:', channelsData.error);
      return new Response(
        JSON.stringify({ 
          error: `Failed to fetch channels: ${channelsData.error}`,
          channels: [] 
        }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Filter to only get channels where the bot is a member
    const botChannels = channelsData.channels
      .filter((channel: any) => channel.is_member)
      .map((channel: any) => channel.name);

    console.log('Bot is member of channels:', botChannels);

    return new Response(
      JSON.stringify({ channels: botChannels }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in fetch-slack-channels:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        errorType: 'unexpected_error',
        channels: [] 
      }), 
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});