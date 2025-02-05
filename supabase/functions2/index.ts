import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from './_shared/cors.ts';
import { logError, logInfo } from './_shared/logging.ts';
import { sendSlackMessage } from './slack-api.ts'; // Import the sendSlackMessage function

// Handle incoming requests
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      status: 200,
      headers: {
        ...corsHeaders,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      }
    });
  }

  try {
    // Special case for VAPI keys - allow GET request
    if (req.method === 'GET' && req.url.includes('get-vapi-keys')) {
      const publicKey = Deno.env.get('VAPI_PUBLIC_KEY');
      const assistantKey = Deno.env.get('VAPI_ASSISTANT_KEY');
      
      if (!publicKey || !assistantKey) {
        logError('Missing VAPI keys', { publicKey: !!publicKey, assistantKey: !!assistantKey });
        throw new Error('Missing required VAPI configuration');
      }
      
      logInfo('VAPI keys retrieved successfully');
      return new Response(
        JSON.stringify({
          secrets: {
            VAPI_PUBLIC_KEY: publicKey,
            VAPI_ASSISTANT_KEY: assistantKey
          }
        }),
        { 
          status: 200,
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json'
          } 
        }
      );
    }

    // For other requests, expect POST with tool calls
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { 
        status: 405,
        headers: corsHeaders 
      });
    }

    const { toolCall } = await req.json();
    logInfo('Received tool call', toolCall);

    let result;
    switch (toolCall?.toolName) {
      case 'send_slack_message':
        result = await sendSlackMessage(toolCall.arguments); // Call the sendSlackMessage function
        break;
      default:
        throw new Error(`Unknown tool: ${toolCall?.toolName}`);
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
    logError('Edge function error', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: error.message 
      }),
      { 
        status: error.status || 400,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json'
        }
      }
    );
  }
});
