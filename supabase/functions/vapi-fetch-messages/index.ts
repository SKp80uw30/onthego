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
    // Log all incoming request headers
    console.log('Incoming request headers:', {
      headers: Object.fromEntries(req.headers.entries()),
      method: req.method,
      url: req.url
    });

    // Verify VAPI secret token
    const vapiSecret = req.headers.get('x-vapi-secret');
    console.log('VAPI Secret verification:', {
      hasSecret: !!vapiSecret,
      matches: vapiSecret === Deno.env.get('VAPI_SERVER_TOKEN')
    });

    if (vapiSecret !== Deno.env.get('VAPI_SERVER_TOKEN')) {
      console.error('Invalid VAPI secret token');
      throw new Error('Unauthorized: Invalid VAPI secret token');
    }

    const toolCallId = req.headers.get('x-tool-call-id');
    console.log('Tool Call ID:', toolCallId);

    if (!toolCallId) {
      throw new Error('Missing tool call ID');
    }

    const body = await req.json();
    console.log('Complete request body:', JSON.stringify(body, null, 2));
    console.log('Request parameters:', {
      channelName: body.Channel_name,
      messageCount: body.Number_fetch_messages,
      otherFields: Object.keys(body)
    });

    // Get the first available Slack account
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: slackAccount, error: accountError } = await supabase
      .from('slack_accounts')
      .select('*')
      .limit(1)
      .single();

    console.log('Slack account query:', {
      success: !accountError,
      hasToken: !!slackAccount?.slack_bot_token,
      workspaceName: slackAccount?.slack_workspace_name,
      error: accountError
    });

    if (accountError || !slackAccount?.slack_bot_token) {
      console.error('Error fetching Slack account:', accountError);
      throw new Error('Failed to get Slack account');
    }

    // Parse the channel name and message count from the request
    const channelName = body.Channel_name;
    const messageCount = body.Number_fetch_messages || 5;

    console.log('Processing request for:', {
      channelName,
      messageCount,
      workspaceName: slackAccount.slack_workspace_name
    });

    // First get the channel ID
    const channelListResponse = await fetch('https://slack.com/api/conversations.list', {
      headers: {
        'Authorization': `Bearer ${slackAccount.slack_bot_token}`,
      },
    });

    const channelList = await channelListResponse.json();
    console.log('Slack channels response:', {
      success: channelList.ok,
      channelCount: channelList.channels?.length,
      error: channelList.error
    });

    if (!channelList.ok) {
      throw new Error(`Failed to fetch channels: ${channelList.error}`);
    }

    const channel = channelList.channels?.find((c: any) => 
      c.name.toLowerCase() === channelName.toLowerCase()
    );

    console.log('Channel lookup result:', {
      channelName,
      found: !!channel,
      channelId: channel?.id,
      isMember: channel?.is_member
    });

    if (!channel) {
      throw new Error(`Channel ${channelName} not found`);
    }

    // Fetch messages from the channel
    console.log('Fetching messages with params:', {
      channelId: channel.id,
      requestedCount: messageCount
    });

    const messagesResponse = await fetch(
      `https://slack.com/api/conversations.history?channel=${channel.id}&limit=${messageCount}`,
      {
        headers: {
          'Authorization': `Bearer ${slackAccount.slack_bot_token}`,
        },
      }
    );

    const messagesData = await messagesResponse.json();
    console.log('Slack messages response:', {
      success: messagesData.ok,
      messageCount: messagesData.messages?.length,
      error: messagesData.error
    });

    if (!messagesData.ok) {
      throw new Error(`Failed to fetch messages: ${messagesData.error}`);
    }

    // Format messages for response
    const messages = messagesData.messages.map((msg: any) => msg.text);

    console.log('Formatted messages:', {
      count: messages.length,
      firstMessage: messages[0]?.substring(0, 50) + '...',
      lastMessage: messages[messages.length - 1]?.substring(0, 50) + '...'
    });

    // Prepare VAPI response
    const response = {
      results: [{
        toolCallId,
        result: JSON.stringify({
          Recent_messages: messages
        })
      }]
    };

    console.log('Final VAPI response:', JSON.stringify(response, null, 2));

    return new Response(
      JSON.stringify(response),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json'
        } 
      }
    );

  } catch (error) {
    console.error('Detailed error in vapi-fetch-messages:', {
      error,
      message: error.message,
      stack: error.stack,
      type: error.constructor.name
    });

    const toolCallId = req.headers.get('x-tool-call-id') || 'unknown_call_id';
    
    const errorResponse = {
      results: [{
        toolCallId,
        result: `Error: ${error.message}`
      }]
    };

    console.log('Error response being sent:', JSON.stringify(errorResponse, null, 2));

    return new Response(
      JSON.stringify(errorResponse),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});