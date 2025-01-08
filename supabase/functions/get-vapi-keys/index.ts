import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const secrets = {
      VAPI_API_KEY: Deno.env.get('VAPI_API_KEY'),
      VAPI_ASSISTANT_KEY: Deno.env.get('VAPI_ASSISTANT_KEY')
    };

    if (!secrets.VAPI_API_KEY || !secrets.VAPI_ASSISTANT_KEY) {
      throw new Error('Missing required Vapi keys');
    }

    return new Response(
      JSON.stringify({ secrets }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});