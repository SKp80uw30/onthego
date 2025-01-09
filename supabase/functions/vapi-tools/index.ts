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

    // Log specific parts we're interested in
    console.log('Message object:', body.message);
    console.log('Tool calls:', body.message?.toolCalls);
    if (body.message?.toolCalls?.[0]) {
      console.log('First tool call details:', {
        id: body.message.toolCalls[0].id,
        function: body.message.toolCalls[0].function,
        type: body.message.toolCalls[0].type
      });
    }

    const toolCall = body.message?.toolCalls?.[0];
    console.log('Tool call details:', toolCall);

    if (!toolCall?.function?.name || !toolCall?.function?.arguments) {
      throw new Error('Invalid tool request structure');
    }

    const toolName = toolCall.function.name;
    // Don't parse arguments if they're already an object
    const toolArgs = typeof toolCall.function.arguments === 'string' 
      ? JSON.parse(toolCall.function.arguments)
      : toolCall.function.arguments;

    console.log('Processing tool:', { toolName, arguments: toolArgs });

    switch (toolName) {
      case 'Send_slack_message': {
        if (!toolArgs.Send_message_approval) {
          console.log('Message not approved for sending');
          return new Response(
            JSON.stringify({ error: 'Message not approved for sending' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get the first available Slack account (we know this works from our SlackService)
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

        // Use the same direct Slack API call approach that works in SlackService
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
        console.log('Slack API response:', slackResult);

        if (!slackResult.ok) {
          console.error('Slack API error:', slackResult.error);
          throw new Error(`Slack API error: ${slackResult.error}`);
        }

        console.log('Message sent successfully to Slack');
        return new Response(
          JSON.stringify(slackResult),
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
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});