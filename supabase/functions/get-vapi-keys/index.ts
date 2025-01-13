import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting get-vapi-keys function execution...');
    
    const vapiPublicKey = Deno.env.get('VAPI_PUBLIC_KEY');
    const vapiAssistantKey = Deno.env.get('VAPI_ASSISTANT_KEY');
    
    console.log('Environment variables retrieved:', {
      hasPublicKey: !!vapiPublicKey,
      hasAssistantKey: !!vapiAssistantKey,
      publicKeyLength: vapiPublicKey?.length,
      assistantKeyLength: vapiAssistantKey?.length,
    });

    if (!vapiPublicKey || !vapiAssistantKey) {
      console.error('Missing required VAPI configuration:', {
        publicKey: !!vapiPublicKey,
        assistantKey: !!vapiAssistantKey,
      });
      throw new Error('Missing required VAPI configuration');
    }

    const secrets = {
      VAPI_PUBLIC_KEY: vapiPublicKey,
      VAPI_ASSISTANT_KEY: vapiAssistantKey,
    };

    console.log('Successfully prepared VAPI keys response');
    
    return new Response(
      JSON.stringify({ secrets }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error in get-vapi-keys function:', {
      error: error.message,
      stack: error.stack,
      type: typeof error,
    });
    
    return new Response(
      JSON.stringify({
        error: error.message,
        details: 'Failed to retrieve VAPI configuration',
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});