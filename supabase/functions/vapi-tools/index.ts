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
    console.log('Request body:', body);

    // Extract tool call from VAPI request structure
    const toolCall = body.message?.toolCalls?.[0];
    if (!toolCall?.function?.name) {
      throw new Error('Tool name is required');
    }

    const toolName = toolCall.function.name;
    const toolArgs = JSON.parse(toolCall.function.arguments);
    
    console.log('Processing tool request:', { toolName, toolArgs });

    switch (toolName) {
      case 'Send_slack_message':
        console.log('Handling Send_slack_message:', toolArgs);
        
        if (!toolArgs.Send_message_approval) {
          return new Response(
            JSON.stringify({ error: 'Message not approved for sending' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Make request to Slack API directly instead of using VAPI's tool endpoint
        const slackResponse = await fetch('https://slack.com/api/chat.postMessage', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SLACK_BOT_TOKEN')}`,
          },
          body: JSON.stringify({
            channel: toolArgs.Channel_name,
            text: toolArgs.Channel_message,
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
        throw new Error(`Unknown tool: ${toolName}`);
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