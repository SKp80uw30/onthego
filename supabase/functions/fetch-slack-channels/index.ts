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
      // If token is invalid, mark this account as needing reauthorization
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

    // Fetch all channel types in parallel
    const [publicChannels, privateChannels, directMessages, groupMessages] = await Promise.all([
      // Public channels
      fetch('https://slack.com/api/conversations.list?types=public_channel&limit=1000', {
        headers: {
          'Authorization': `Bearer ${slackAccount.slack_bot_token}`,
          'Content-Type': 'application/json',
        },
      }).then(res => res.json()),
      
      // Private channels
      fetch('https://slack.com/api/conversations.list?types=private_channel&limit=1000', {
        headers: {
          'Authorization': `Bearer ${slackAccount.slack_bot_token}`,
          'Content-Type': 'application/json',
        },
      }).then(res => res.json()),
      
      // Direct messages
      fetch('https://slack.com/api/conversations.list?types=im&limit=1000', {
        headers: {
          'Authorization': `Bearer ${slackAccount.slack_bot_token}`,
          'Content-Type': 'application/json',
        },
      }).then(res => res.json()),
      
      // Group messages
      fetch('https://slack.com/api/conversations.list?types=mpim&limit=1000', {
        headers: {
          'Authorization': `Bearer ${slackAccount.slack_bot_token}`,
          'Content-Type': 'application/json',
        },
      }).then(res => res.json()),
    ]);
    
    console.log('Channel fetch responses:', {
      publicOk: publicChannels.ok,
      privateOk: privateChannels.ok,
      dmsOk: directMessages.ok,
      groupOk: groupMessages.ok,
      publicCount: publicChannels.channels?.length,
      privateCount: privateChannels.channels?.length,
      dmCount: directMessages.channels?.length,
      groupCount: groupMessages.channels?.length,
    });

    // Combine all channels where the bot is a member
    const allChannels = [
      ...(publicChannels.ok ? publicChannels.channels : []),
      ...(privateChannels.ok ? privateChannels.channels : []),
      ...(directMessages.ok ? directMessages.channels : []),
      ...(groupMessages.ok ? groupMessages.channels : [])
    ].filter(channel => channel.is_member);

    // Get user info for DMs
    if (directMessages.ok && directMessages.channels?.length > 0) {
      const userIds = directMessages.channels.map((dm: any) => dm.user);
      const uniqueUserIds = [...new Set(userIds)].filter(Boolean);

      if (uniqueUserIds.length > 0) {
        const usersResponse = await fetch('https://slack.com/api/users.info', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${slackAccount.slack_bot_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ users: uniqueUserIds.join(',') })
        });

        const usersData = await usersResponse.json();
        if (usersData.ok) {
          // Map user IDs to their names
          const userMap = new Map(usersData.users.map((user: any) => [user.id, user.name]));
          
          // Update DM channel names with user names
          allChannels.forEach(channel => {
            if (channel.is_im && channel.user) {
              const userName = userMap.get(channel.user);
              if (userName) {
                channel.name = `dm-${userName}`;
              }
            }
          });
        }
      }
    }

    // Format channel names appropriately
    const formattedChannels = allChannels.map(channel => {
      if (channel.is_im) {
        return channel.name; // Already formatted above
      } else if (channel.is_mpim) {
        return `group-${channel.name.replace('mpdm-', '')}`;
      } else if (channel.is_private) {
        return `private-${channel.name}`;
      } else {
        return channel.name;
      }
    });

    console.log('Returning channels:', {
      totalCount: formattedChannels.length,
      types: {
        public: formattedChannels.filter(name => !name.startsWith('dm-') && !name.startsWith('group-') && !name.startsWith('private-')).length,
        private: formattedChannels.filter(name => name.startsWith('private-')).length,
        dm: formattedChannels.filter(name => name.startsWith('dm-')).length,
        group: formattedChannels.filter(name => name.startsWith('group-')).length,
      }
    });

    return new Response(
      JSON.stringify({ channels: formattedChannels }), 
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