import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SEND_SLACK_MESSAGE_TOOL_ID = "58c5d100-8f8b-4794-a275-9059e0cfa9db";

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
    const toolArgs = toolCall.function.arguments;
    
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
        
        const vapiResponse = await fetch(`https://api.vapi.ai/tools/${SEND_SLACK_MESSAGE_TOOL_ID}/run`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-vapi-secret': Deno.env.get('VAPI_SERVER_TOKEN') || '',
          },
          body: JSON.stringify({
            channelName: toolArgs.Channel_name,
            message: toolArgs.Channel_message
          })
        });

        if (!vapiResponse.ok) {
          const errorData = await vapiResponse.text();
          console.error('VAPI API error response:', {
            status: vapiResponse.status,
            statusText: vapiResponse.statusText,
            body: errorData
          });
          throw new Error(`VAPI API error: ${errorData}`);
        }

        const vapiResult = await vapiResponse.json();
        console.log('VAPI API successful response:', vapiResult);

        return new Response(
          JSON.stringify(vapiResult),
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