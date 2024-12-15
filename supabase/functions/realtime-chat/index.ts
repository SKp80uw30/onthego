import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      console.error('OpenAI API key not found');
      throw new Error('OpenAI API key not found');
    }

    // Get the WebSocket upgrade header
    const upgrade = req.headers.get('upgrade') || '';
    if (upgrade.toLowerCase() !== 'websocket') {
      console.error('Not a WebSocket upgrade request');
      return new Response('Expected WebSocket upgrade', { 
        status: 426,
        headers: { ...corsHeaders, 'Upgrade': 'WebSocket' }
      });
    }

    console.log('Upgrading connection to WebSocket');
    const { response, socket } = Deno.upgradeWebSocket(req);

    console.log('Connecting to OpenAI WebSocket');
    const openAIWs = new WebSocket('wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01', [
      'realtime',
      `openai-insecure-api-key.${openAIApiKey}`,
      'openai-beta.realtime-v1',
    ]);
    
    openAIWs.onopen = () => {
      console.log('Connected to OpenAI WebSocket');
      
      // Send initial configuration after connection
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
    };

    openAIWs.onerror = (error) => {
      console.error('OpenAI WebSocket error:', error);
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'error', message: 'OpenAI connection error' }));
      }
    };

    // Forward messages from OpenAI to the client
    openAIWs.onmessage = (event) => {
      console.log('Received message from OpenAI:', event.data);
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(event.data);
      }
    };

    // Handle messages from the client
    socket.onmessage = async (event) => {
      console.log('Received message from client:', event.data);
      if (openAIWs.readyState === WebSocket.OPEN) {
        openAIWs.send(event.data);
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
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});