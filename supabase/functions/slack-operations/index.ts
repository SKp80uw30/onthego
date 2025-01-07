import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, channelName, message, count = 5, slackAccountId } = await req.json();

    if (!slackAccountId) {
      throw new Error('Slack account ID is required');
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get Slack account details
    const { data: slackAccount, error: accountError } = await supabase
      .from('slack_accounts')
      .select('slack_bot_token')
      .eq('id', slackAccountId)
      .single();

    if (accountError || !slackAccount?.slack_bot_token) {
      throw new Error('Failed to get Slack account details');
    }

    // Get channel ID
    const channelListResponse = await fetch('https://slack.com/api/conversations.list', {
      headers: {
        'Authorization': `Bearer ${slackAccount.slack_bot_token}`,
      },
    });

    const channelList = await channelListResponse.json();
    if (!channelList.ok) {
      throw new Error(`Slack API error: ${channelList.error}`);
    }

    const channel = channelList.channels.find((c: any) => c.name === channelName);
    if (!channel) {
      throw new Error(`Channel ${channelName} not found`);
    }

    switch (action) {
      case 'SEND_MESSAGE': {
        if (!message) {
          throw new Error('Message is required');
        }

        const response = await fetch('https://slack.com/api/chat.postMessage', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${slackAccount.slack_bot_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            channel: channel.id,
            text: message,
          }),
        });

        const result = await response.json();
        if (!result.ok) {
          throw new Error(`Failed to send message: ${result.error}`);
        }

        return new Response(
          JSON.stringify({ message: 'Message sent successfully' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'FETCH_MESSAGES':
      case 'FETCH_MENTIONS': {
        const messagesResponse = await fetch('https://slack.com/api/conversations.history', {
          headers: {
            'Authorization': `Bearer ${slackAccount.slack_bot_token}`,
          },
          body: JSON.stringify({
            channel: channel.id,
            limit: count * 3, // Fetch more messages when looking for mentions
          }),
        });

        const messagesData = await messagesResponse.json();
        if (!messagesData.ok) {
          throw new Error(`Failed to fetch messages: ${messagesData.error}`);
        }

        let messages = messagesData.messages;
        if (action === 'FETCH_MENTIONS') {
          messages = messages
            .filter((msg: any) => msg.text.includes('@'))
            .slice(0, count);
        } else {
          messages = messages.slice(0, count);
        }

        return new Response(
          JSON.stringify({ messages: messages.map((msg: any) => msg.text) }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error('Error in slack-operations function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});