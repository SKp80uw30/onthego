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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json();
    console.log('Complete raw request body:', JSON.stringify(body, null, 2));
    console.log('Request headers:', Object.fromEntries(req.headers.entries()));

    console.log('Message object:', body.message);
    console.log('Tool calls:', body.message?.toolCalls);
    
    const toolCall = body.message?.toolCalls?.[0];
    console.log('Tool call details:', toolCall);

    if (!toolCall?.function?.name || !toolCall?.function?.arguments) {
      throw new Error('Invalid tool request structure');
    }

    const toolName = toolCall.function.name;
    const toolCallId = toolCall.id;
    const toolArgs = typeof toolCall.function.arguments === 'string' 
      ? JSON.parse(toolCall.function.arguments)
      : toolCall.function.arguments;

    console.log('Processing tool:', { toolName, arguments: toolArgs });

    switch (toolName) {
      case 'Send_slack_message': {
        if (!toolArgs.Send_message_approval) {
          console.log('Message not approved for sending');
          return new Response(
            JSON.stringify({
              results: [{
                toolCallId,
                result: "Message not approved for sending"
              }]
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get the first available Slack account
        const { data: slackAccount, error: accountError } = await supabase
          .from('slack_accounts')
          .select('*')
          .limit(1)
          .single();

        if (accountError || !slackAccount?.slack_bot_token) {
          console.error('Error fetching Slack account:', accountError);
          throw new Error('Failed to get Slack account');
        }

        console.log('Found Slack account:', {
          id: slackAccount.id,
          workspace: slackAccount.slack_workspace_name
        });

        const response = await fetch('https://slack.com/api/chat.postMessage', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${slackAccount.slack_bot_token}`,
          },
          body: JSON.stringify({
            channel: toolArgs.Channel_name,
            text: toolArgs.Channel_message,
          })
        });

        const slackResult = await response.json();
        console.log('Slack API response:', JSON.stringify(slackResult, null, 2));

        if (!slackResult.ok) {
          console.error('Slack API error:', slackResult.error);
          return new Response(
            JSON.stringify({
              results: [{
                toolCallId,
                result: `Failed to send message: ${slackResult.error}`
              }]
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log('Message sent successfully to Slack');
        return new Response(
          JSON.stringify({
            results: [{
              toolCallId,
              result: "Message sent successfully to Slack"
            }]
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'Fetch_slack_messages': {
        console.log('Fetching Slack messages with args:', toolArgs);
        
        // Get the first available Slack account
        const { data: slackAccount, error: accountError } = await supabase
          .from('slack_accounts')
          .select('*')
          .limit(1)
          .single();

        if (accountError || !slackAccount?.slack_bot_token) {
          console.error('Error fetching Slack account:', accountError);
          throw new Error('Failed to get Slack account');
        }

        console.log('Using Slack account:', {
          id: slackAccount.id,
          workspace: slackAccount.slack_workspace_name
        });

        // First get the channel ID
        const channelListResponse = await fetch('https://slack.com/api/conversations.list', {
          headers: {
            'Authorization': `Bearer ${slackAccount.slack_bot_token}`,
          },
        });

        const channelList = await channelListResponse.json();
        if (!channelList.ok) {
          console.error('Slack API error:', channelList.error);
          throw new Error(`Slack API error: ${channelList.error}`);
        }

        const channel = channelList.channels.find((c: any) => 
          c.name.toLowerCase() === toolArgs.Channel_name.toLowerCase()
        );
        
        if (!channel) {
          console.error('Channel not found:', toolArgs.Channel_name);
          return new Response(
            JSON.stringify({
              results: [{
                toolCallId,
                result: `Channel ${toolArgs.Channel_name} not found`
              }]
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log('Found channel:', { 
          channelId: channel.id, 
          channelName: channel.name,
          isMember: channel.is_member 
        });

        // Now fetch messages from the channel
        const messagesResponse = await fetch(
          `https://slack.com/api/conversations.history?channel=${channel.id}&limit=5`,
          {
            headers: {
              'Authorization': `Bearer ${slackAccount.slack_bot_token}`,
            },
          }
        );

        const messagesData = await messagesResponse.json();
        if (!messagesData.ok) {
          console.error('Failed to fetch messages:', messagesData.error);
          return new Response(
            JSON.stringify({
              results: [{
                toolCallId,
                result: `Failed to fetch messages: ${messagesData.error}`
              }]
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const messages = messagesData.messages.map((msg: any) => msg.text);
        console.log('Successfully fetched messages:', {
          count: messages.length,
          preview: messages[0]?.substring(0, 50)
        });

        return new Response(
          JSON.stringify({
            results: [{
              toolCallId,
              result: JSON.stringify({
                Recent_messages: messages
              })
            }]
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        console.error('Unknown tool requested:', toolName);
        throw new Error(`Unknown tool: ${toolName}`);
    }
  } catch (error) {
    console.error('Error in vapi-tools function:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    
    const toolCallId = error.toolCallId || 
      (error.request?.body?.message?.toolCalls?.[0]?.id) || 
      'unknown_call_id';
      
    return new Response(
      JSON.stringify({
        results: [{
          toolCallId,
          result: `Error: ${error.message}`
        }]
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});