import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from './slack-operations.ts';
import { handleToolCall, ToolCall } from './tool-handlers.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log('Request body:', JSON.stringify(body, null, 2));

    const toolCall = body.message?.toolCalls?.[0] as ToolCall;
    if (!toolCall?.function?.name || !toolCall?.function?.arguments) {
      throw new Error('Invalid tool request structure');
    }

    const result = await handleToolCall(toolCall);

    return new Response(
      JSON.stringify({ results: [result] }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in vapi-tools function:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    
    const toolCallId = error.toolCallId || 
      (error.request?.body?.message?.toolCalls?.[0]?.id) || 
      'unknown_call_id';
      
    return new Response(
      JSON.stringify({
        results: [{
          toolCallId,
          result: `Error: ${error.message}`
        }]
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});