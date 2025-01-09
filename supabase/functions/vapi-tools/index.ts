import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json();
    console.log('Complete raw request body:', JSON.stringify(body, null, 2));

    // Extract tool call from the correct path
    const toolCall = body.message?.toolCalls?.[0];
    console.log('Tool call details:', toolCall);

    if (!toolCall?.function?.name || !toolCall?.function?.arguments) {
      throw new Error('Invalid tool request structure');
    }

    const toolName = toolCall.function.name;
    const toolArgs = toolCall.function.arguments;

    console.log('Processing tool:', { toolName, arguments: toolArgs });

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    switch (toolName) {
      case 'Send_slack_message': {
        if (!toolArgs.Send_message_approval) {
          return new Response(
            JSON.stringify({ error: 'Message not approved for sending' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get the first available Slack account (you might want to make this more specific)
        const { data: slackAccount, error: slackError } = await supabase
          .from('slack_accounts')
          .select('slack_bot_token')
          .limit(1)
          .single();

        if (slackError || !slackAccount) {
          throw new Error('No Slack account found');
        }

        // Make request to Slack API
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
          throw new Error(`Slack API error: ${slackResult.error}`);
        }

        return new Response(
          JSON.stringify(slackResult),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  } catch (error) {
    console.error('Error in vapi-tools function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});