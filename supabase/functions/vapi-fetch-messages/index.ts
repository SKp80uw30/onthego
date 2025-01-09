import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-vapi-secret',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify VAPI secret token
    const vapiSecret = req.headers.get('x-vapi-secret');
    if (vapiSecret !== Deno.env.get('VAPI_SERVER_TOKEN')) {
      console.error('Invalid VAPI secret token');
      throw new Error('Unauthorized: Invalid VAPI secret token');
    }

    const toolCallId = req.headers.get('x-tool-call-id');
    if (!toolCallId) {
      throw new Error('Missing tool call ID');
    }

    const body = await req.json();
    console.log('Request body:', JSON.stringify(body, null, 2));

    // Get the first available Slack account (you might want to make this more specific later)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: slackAccount, error: accountError } = await supabase
      .from('slack_accounts')
      .select('*')
      .limit(1)
      .single();

    if (accountError || !slackAccount?.slack_bot_token) {
      console.error('Error fetching Slack account:', accountError);
      throw new Error('Failed to get Slack account');
    }

    // Parse the channel name and message count from the request
    const channelName = body.Channel_name;
    const messageCount = body.Number_fetch_messages || 5;

    // First get the channel ID
    const channelListResponse = await fetch('https://slack.com/api/conversations.list', {
      headers: {
        'Authorization': `Bearer ${slackAccount.slack_bot_token}`,
      },
    });

    const channelList = await channelListResponse.json();
    if (!channelList.ok) {
      throw new Error(`Failed to fetch channels: ${channelList.error}`);
    }

    const channel = channelList.channels?.find((c: any) => 
      c.name.toLowerCase() === channelName.toLowerCase()
    );

    if (!channel) {
      throw new Error(`Channel ${channelName} not found`);
    }

    // Fetch messages from the channel
    const messagesResponse = await fetch(
      `https://slack.com/api/conversations.history?channel=${channel.id}&limit=${messageCount}`,
      {
        headers: {
          'Authorization': `Bearer ${slackAccount.slack_bot_token}`,
        },
      }
    );

    const messagesData = await messagesResponse.json();
    if (!messagesData.ok) {
      throw new Error(`Failed to fetch messages: ${messagesData.error}`);
    }

    // Format messages for response
    const messages = messagesData.messages.map((msg: any) => msg.text);

    console.log('Successfully fetched messages:', {
      channelName,
      messageCount: messages.length,
      messages
    });

    // Return the response in VAPI's expected format
    return new Response(
      JSON.stringify({
        results: [{
          toolCallId,
          result: JSON.stringify({
            Recent_messages: messages
          })
        }]
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json'
        } 
      }
    );

  } catch (error) {
    console.error('Error in vapi-fetch-messages function:', error);
    const toolCallId = req.headers.get('x-tool-call-id') || 'unknown_call_id';
    
    return new Response(
      JSON.stringify({
        results: [{
          toolCallId,
          result: `Error: ${error.message}`
        }]
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});