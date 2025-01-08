import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SEND_SLACK_MESSAGE_TOOL_ID = "58c5d100-8f8b-4794-a275-9059e0cfa9db";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tool, parameters } = await req.json();
    
    console.log('VAPI Tool called:', {
      tool,
      parameters,
      timestamp: new Date().toISOString(),
      headers: Object.fromEntries(req.headers.entries())
    });

    // Add VAPI server token to headers for outgoing requests
    const vapiHeaders = {
      'Content-Type': 'application/json',
      'x-vapi-secret': Deno.env.get('VAPI_SERVER_TOKEN'),
    };

    // Log the start of tool execution
    console.log('Starting tool execution:', tool);

    switch (tool) {
      case 'send_slack_message':
        console.log('Handling send_slack_message:', parameters);
        
        // Make request to VAPI API with the tool ID
        const vapiResponse = await fetch(`https://api.vapi.ai/tools/${SEND_SLACK_MESSAGE_TOOL_ID}/run`, {
          method: 'POST',
          headers: vapiHeaders,
          body: JSON.stringify(parameters)
        });

        if (!vapiResponse.ok) {
          const errorData = await vapiResponse.text();
          console.error('VAPI API error:', errorData);
          throw new Error(`VAPI API error: ${errorData}`);
        }

        const vapiResult = await vapiResponse.json();
        console.log('VAPI API response:', vapiResult);

        return new Response(
          JSON.stringify(vapiResult),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      default:
        console.error('Unknown tool called:', tool);
        throw new Error(`Unknown tool: ${tool}`);
    }
  } catch (error) {
    console.error('Error in vapi-tools function:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });

    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});