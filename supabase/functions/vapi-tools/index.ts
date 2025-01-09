import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Received request:', {
      method: req.method,
      headers: Object.fromEntries(req.headers.entries())
    });

    const body = await req.json();
    console.log('Complete raw request body:', JSON.stringify(body, null, 2));

    // Extract tool call from request structure
    console.log('Tool request details:', {
      toolName: body.toolName,
      toolArgs: body.toolArgs
    });

    if (!body.toolName || !body.toolArgs) {
      throw new Error('Invalid tool request structure');
    }

    switch (body.toolName) {
      case 'Send_slack_message':
        console.log('Handling Send_slack_message:', body.toolArgs);
        
        if (!body.toolArgs.Send_message_approval) {
          return new Response(
            JSON.stringify({ error: 'Message not approved for sending' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Make request to Slack API
        const slackResponse = await fetch('https://slack.com/api/chat.postMessage', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SLACK_BOT_TOKEN')}`,
          },
          body: JSON.stringify({
            channel: body.toolArgs.Channel_name,
            text: body.toolArgs.Channel_message,
          })
        });

        if (!slackResponse.ok) {
          const errorData = await slackResponse.text();
          console.error('Slack API error response:', {
            status: slackResponse.status,
            statusText: slackResponse.statusText,
            body: errorData
          });
          throw new Error(`Slack API error: ${errorData}`);
        }

        const slackResult = await slackResponse.json();
        console.log('Slack API successful response:', slackResult);

        return new Response(
          JSON.stringify(slackResult),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      default:
        throw new Error(`Unknown tool: ${body.toolName}`);
    }
  } catch (error) {
    console.error('Error in vapi-tools function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});