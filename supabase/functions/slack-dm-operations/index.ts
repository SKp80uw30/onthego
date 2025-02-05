import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from './dm-api.ts';
import { handleSendDM } from './handlers.ts';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { slackAccountId, userIdentifier, message } = await req.json();
    console.log('Received DM request:', { slackAccountId, userIdentifier, message });

    if (!slackAccountId || !userIdentifier || !message) {
      throw new Error('Missing required parameters: slackAccountId, userIdentifier, and message are required');
    }

    const result = await handleSendDM(slackAccountId, userIdentifier, message);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in slack-dm-operations:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});