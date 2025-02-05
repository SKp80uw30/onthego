import { corsHeaders } from '../_shared/cors.ts';
import { logError, logInfo } from '../_shared/logging.ts';
import { handleChannelMessage } from './tools/channel-tools.ts';
import { handleDMMessage } from './tools/dm-tools.ts';

interface ToolCall {
  toolName: string;
  arguments: string | Record<string, any>;
}

// Handle incoming requests
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { toolCall } = await req.json() as { toolCall: ToolCall };
    logInfo('Processing tool call', toolCall);

    // Parse arguments if they're a string
    const args = typeof toolCall.arguments === 'string' 
      ? JSON.parse(toolCall.arguments) 
      : toolCall.arguments;

    let result;
    switch (toolCall.toolName) {
      case 'Send_slack_message':
        result = await handleChannelMessage(args);
        break;
      case 'Send_dm_message':
        result = await handleDMMessage(args);
        break;
      default:
        throw new Error(`Unknown tool: ${toolCall.toolName}`);
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    logError('VAPI tool handler', error);
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