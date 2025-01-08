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
    console.log('Received request:', {
      method: req.method,
      headers: Object.fromEntries(req.headers.entries())
    });

    const requestBody = await req.json();
    console.log('Request body:', {
      body: requestBody,
      toolType: typeof requestBody.tool,
      parametersType: typeof requestBody.parameters,
      fullBody: JSON.stringify(requestBody, null, 2)
    });

    const { tool, parameters } = requestBody;
    
    if (!tool) {
      throw new Error('Tool name is required');
    }

    console.log('Processing tool request:', {
      tool,
      parameters,
      timestamp: new Date().toISOString()
    });

    switch (tool) {
      case 'send_slack_message':
        console.log('Handling send_slack_message:', parameters);
        
        // Make request to VAPI API with the tool ID
        const vapiResponse = await fetch(`https://api.vapi.ai/tools/${SEND_SLACK_MESSAGE_TOOL_ID}/run`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-vapi-secret': Deno.env.get('VAPI_SERVER_TOKEN') || '',
          },
          body: JSON.stringify(parameters)
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