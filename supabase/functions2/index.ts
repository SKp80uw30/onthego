import { corsHeaders } from './_shared/cors.ts';
import { logError, logInfo } from './_shared/logging.ts';

interface ToolCall {
  toolName: string;
  arguments?: string | Record<string, any>;
}

// Handle incoming requests
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { toolCall } = await req.json() as { toolCall: ToolCall };
    logInfo('Processing tool call', toolCall);

    let result;
    switch (toolCall.toolName) {
      case 'get_vapi_keys':
        result = {
          secrets: {
            VAPI_PUBLIC_KEY: Deno.env.get('VAPI_PUBLIC_KEY'),
            VAPI_ASSISTANT_KEY: Deno.env.get('VAPI_ASSISTANT_KEY')
          }
        };
        break;
      default:
        throw new Error(`Unknown tool: ${toolCall.toolName}`);
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    logError('Tool handler', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: `Error processing tool call: ${error.message}` 
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});