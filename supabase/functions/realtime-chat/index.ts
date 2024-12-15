import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth token from URL
    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    
    if (!token) {
      console.error('No authentication token provided');
      return new Response('Authentication required', { 
        status: 401,
        headers: corsHeaders 
      });
    }

    // Verify the token
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Invalid authentication token:', authError);
      return new Response('Invalid authentication', { 
        status: 401,
        headers: corsHeaders 
      });
    }

    // Check for WebSocket upgrade
    const upgrade = req.headers.get('upgrade') || '';
    if (upgrade.toLowerCase() !== 'websocket') {
      console.error('Not a WebSocket upgrade request');
      return new Response('Expected WebSocket upgrade', { 
        status: 426,
        headers: { ...corsHeaders, 'Upgrade': 'WebSocket' }
      });
    }

    console.log('Upgrading connection to WebSocket for user:', user.id);
    const { response, socket } = Deno.upgradeWebSocket(req);

    // Connect to OpenAI WebSocket
    console.log('Connecting to OpenAI WebSocket');
    const openAIWs = new WebSocket('wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01', [
      'realtime',
      `openai-insecure-api-key.${openAIApiKey}`,
      'openai-beta.realtime-v1',
    ]);

    let sessionConfigured = false;
    
    openAIWs.onopen = () => {
      console.log('Connected to OpenAI WebSocket');
    };

    openAIWs.onmessage = (event) => {
      console.log('Received from OpenAI:', event.data);
      const data = JSON.parse(event.data);
      
      // Configure session after receiving session.created event
      if (data.type === 'session.created' && !sessionConfigured) {
        console.log('Configuring session');
        openAIWs.send(JSON.stringify({
          "type": "session.update",
          "session": {
            "modalities": ["text", "audio"],
            "instructions": "You are a helpful assistant.",
            "voice": "alloy",
            "input_audio_format": "pcm16",
            "output_audio_format": "pcm16",
            "input_audio_transcription": {
              "model": "whisper-1"
            },
            "turn_detection": {
              "type": "server_vad",
              "threshold": 0.5,
              "prefix_padding_ms": 300,
              "silence_duration_ms": 1000
            }
          }
        }));
        sessionConfigured = true;
      }
      
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(event.data);
      }
    };

    openAIWs.onerror = (error) => {
      console.error('OpenAI WebSocket error:', error);
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ 
          type: 'error', 
          message: 'OpenAI connection error',
          timestamp: new Date().toISOString()
        }));
      }
    };

    // Handle messages from client
    socket.onmessage = async (event) => {
      console.log('Received from client:', event.data);
      if (openAIWs.readyState === WebSocket.OPEN) {
        openAIWs.send(event.data);
      } else {
        console.error('OpenAI WebSocket not ready');
        socket.send(JSON.stringify({ 
          type: 'error', 
          message: 'OpenAI connection not ready',
          timestamp: new Date().toISOString()
        }));
      }
    };

    socket.onclose = () => {
      console.log('Client disconnected');
      openAIWs.close();
    };

    socket.onerror = (error) => {
      console.error('Client WebSocket error:', error);
    };

    return response;
  } catch (error) {
    console.error('Error in realtime-chat function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});