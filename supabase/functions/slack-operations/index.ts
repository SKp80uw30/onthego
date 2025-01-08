import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from './slack-api.ts';
import { handleSendMessage, handleFetchMessages } from './handlers.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, channelName, message, count = 5, slackAccountId } = await req.json();
    console.log('Received request:', { action, channelName, message, count, slackAccountId });

    if (!slackAccountId) {
      throw new Error('Slack account ID is required');
    }

    let result;
    switch (action) {
      case 'SEND_MESSAGE':
        result = await handleSendMessage(slackAccountId, channelName, message);
        break;
      case 'FETCH_MESSAGES':
      case 'FETCH_MENTIONS':
        result = await handleFetchMessages(slackAccountId, channelName, count, action === 'FETCH_MENTIONS');
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in slack-operations function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});