import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // Log the start of tool execution
    console.log('Starting tool execution:', tool);

    switch (tool) {
      case 'send_slack_message':
        console.log('Handling send_slack_message:', parameters);
        // We'll implement the actual Slack integration later
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Message would be sent to Slack',
            parameters 
          }),
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