import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from '../_shared/cors.ts';
import { handleChannelTools } from './tools/channel-tools.ts';
import { handleDMTools } from './tools/dm-tools.ts';
import { logError, logInfo } from '../_shared/logging.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    logInfo('VAPI tools request:', JSON.stringify(body, null, 2));

    const toolCall = body.message?.toolCalls?.[0];
    if (!toolCall?.function?.name || !toolCall?.function?.arguments) {
      throw new Error('Invalid tool request structure');
    }

    const toolName = toolCall.function.name;
    const toolArgs = typeof toolCall.function.arguments === 'string' 
      ? JSON.parse(toolCall.function.arguments)
      : toolCall.function.arguments;

    logInfo('Processing tool call:', { 
      toolName, 
      toolCallId: toolCall.id,
      arguments: toolArgs 
    });

    let result;
    if (toolName.startsWith('send_direct_message') || toolName === 'Fetch_slack_dms') {
      result = await handleDMTools(toolName, toolArgs);
    } else {
      result = await handleChannelTools(toolName, toolArgs);
    }

    return new Response(
      JSON.stringify({ 
        results: [{
          toolCallId: toolCall.id,
          result
        }]
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    logError('Error in vapi-tools function:', error);
    
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