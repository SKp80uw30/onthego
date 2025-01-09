import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from './slack-api.ts';
import { getSlackAccount } from './db.ts';
import { getSlackChannel, fetchSlackMessages } from './slack-api.ts';

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
    const slackAccount = await getSlackAccount();

    // Parse the channel name and message count from the request
    const channelName = body.Channel_name;
    const messageCount = body.Number_fetch_messages || 5;

    console.log('Processing request for:', {
      channelName,
      messageCount,
      workspaceName: slackAccount.slack_workspace_name
    });

    // Get channel info
    const channel = await getSlackChannel(slackAccount.slack_bot_token, channelName);

    // Fetch messages from the channel
    console.log('Fetching messages with params:', {
      channelId: channel.id,
      requestedCount: messageCount
    });

    const messages = await fetchSlackMessages(slackAccount.slack_bot_token, channel.id, messageCount);

    // Format messages for response
    const formattedMessages = messages.map((msg: any) => msg.text);

    console.log('Formatted messages:', {
      count: formattedMessages.length,
      firstMessage: formattedMessages[0]?.substring(0, 50) + '...',
      lastMessage: formattedMessages[formattedMessages.length - 1]?.substring(0, 50) + '...'
    });

    // Prepare VAPI response
    const response = {
      results: [{
        toolCallId,
        result: JSON.stringify({
          Recent_messages: formattedMessages
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