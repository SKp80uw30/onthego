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

    const { slackAccountId } = await req.json();
    console.log('Fetching channels for workspace ID:', slackAccountId);

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
        JSON.stringify({ error: 'No Slack workspace connected', channels: [] }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Found workspace:', slackAccount.slack_workspace_name);

    // Auth test
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

    // Fetch channels
    const publicChannels = await fetch('https://slack.com/api/conversations.list?types=public_channel&limit=1000', {
      headers: {
        'Authorization': `Bearer ${slackAccount.slack_bot_token}`,
      },
    }).then(res => res.json());

    const privateChannels = await fetch('https://slack.com/api/conversations.list?types=private_channel&limit=1000', {
      headers: {
        'Authorization': `Bearer ${slackAccount.slack_bot_token}`,
      },
    }).then(res => res.json());

    console.log('Channel fetch responses:', {
      publicOk: publicChannels.ok,
      privateOk: privateChannels.ok,
      publicCount: publicChannels.channels?.length,
      privateCount: privateChannels.channels?.length,
      publicError: publicChannels.error,
      privateError: privateChannels.error
    });

    // Combine and format channels
    const allChannels = [
      ...(publicChannels.ok ? publicChannels.channels.map(channel => ({
        ...channel,
        formatted_name: channel.name
      })) : []),
      ...(privateChannels.ok ? privateChannels.channels.map(channel => ({
        ...channel,
        formatted_name: `private-${channel.name}`
      })) : [])
    ].filter(channel => channel.is_member);

    console.log('Formatted channels:', {
      totalCount: allChannels.length,
      channels: allChannels.map(c => c.formatted_name)
    });

    // Format final channel names
    const formattedChannels = allChannels.map(channel => {
      if (channel.is_private) {
        return `private-${channel.name}`;
      }
      return channel.name;
    });

    return new Response(
      JSON.stringify({ 
        channels: formattedChannels,
        debug: {
          publicChannels: publicChannels.ok ? publicChannels.channels.length : 0,
          privateChannels: privateChannels.ok ? privateChannels.channels.length : 0,
          totalFormatted: formattedChannels.length
        }
      }), 
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