import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Get the slack account ID from the request
    const { slackAccountId } = await req.json();
    
    console.log('Fetching channels for slack account:', slackAccountId);

    // Get the Slack token from our database
    const { data: slackAccount, error: slackError } = await supabaseClient
      .from('slack_accounts')
      .select('slack_bot_token')
      .eq('id', slackAccountId)
      .single();

    if (slackError || !slackAccount) {
      console.error('Error fetching slack account:', slackError);
      throw new Error('Slack account not found');
    }

    console.log('Successfully retrieved Slack token');

    // Call Slack API to get the list of channels
    const response = await fetch('https://slack.com/api/conversations.list?types=public_channel,private_channel', {
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
      responseStatus: response.status
    });
    
    if (!channelsData.ok) {
      console.error('Error from Slack API:', channelsData.error);
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