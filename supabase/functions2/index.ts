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
    return new Response('ok', { 
      status: 200,
      headers: corsHeaders 
    });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405,
      headers: corsHeaders 
    });
  }

  try {
    const { toolCall } = await req.json() as { toolCall: ToolCall };
    logInfo('Processing tool call', toolCall);

    let result;
    switch (toolCall.toolName) {
      case 'get_vapi_keys':
        const publicKey = Deno.env.get('VAPI_PUBLIC_KEY');
        const assistantKey = Deno.env.get('VAPI_ASSISTANT_KEY');
        
        if (!publicKey || !assistantKey) {
          logError('Missing VAPI keys', { publicKey: !!publicKey, assistantKey: !!assistantKey });
          throw new Error('Missing required VAPI configuration');
        }
        
        result = {
          secrets: {
            VAPI_PUBLIC_KEY: publicKey,
            VAPI_ASSISTANT_KEY: assistantKey
          }
        };
        logInfo('VAPI keys retrieved successfully');
        break;
        
      default:
        throw new Error(`Unknown tool: ${toolCall.toolName}`);
    }

    return new Response(
      JSON.stringify(result),
      { 
        status: 200,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json'
        } 
      }
    );
  } catch (error) {
    logError('Tool handler error', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: `Error processing tool call: ${error.message}` 
      }),
      { 
        status: 400,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json'
        }
      }
    );
  }
});