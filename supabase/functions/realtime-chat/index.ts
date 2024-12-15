import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { corsHeaders } from '../_shared/cors.ts';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Check if it's a WebSocket upgrade request
  if (req.headers.get("upgrade") === "websocket") {
    const { socket, response } = Deno.upgradeWebSocket(req);
    
    // Get the token from URL parameters
    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    
    if (!token) {
      socket.close(1008, 'No authentication token provided');
      return response;
    }

    // Verify the token
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      socket.close(1008, 'Invalid authentication token');
      return response;
    }

    socket.onopen = () => {
      console.log("WebSocket opened");
    };

    socket.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (!data.audio || !Array.isArray(data.audio)) {
          throw new Error('Invalid audio data format');
        }

        // Process audio with OpenAI API
        const openAIResponse = await fetch('https://api.openai.com/v1/audio/speech', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'tts-1',
            input: data.audio,
            voice: 'alloy',
          }),
        });

        if (!openAIResponse.ok) {
          throw new Error(`OpenAI API error: ${openAIResponse.statusText}`);
        }

        const audioBuffer = await openAIResponse.arrayBuffer();
        socket.send(audioBuffer);
      } catch (error) {
        console.error('Error processing message:', error);
        socket.send(JSON.stringify({ error: error.message }));
      }
    };

    socket.onerror = (e) => console.error("WebSocket error:", e);
    socket.onclose = () => console.log("WebSocket closed");

    return response;
  }

  return new Response('Expected a WebSocket connection', { 
    status: 426,
    headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
  });
});