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
      throw new Error('OpenAI API key not found');
    }

    console.log('Upgrading connection to WebSocket');
    // Upgrade the request to a WebSocket connection
    const { response, socket } = Deno.upgradeWebSocket(req);

    console.log('Connecting to OpenAI WebSocket');
    // Connect to OpenAI's WebSocket
    const openAIWs = new WebSocket('wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01');
    
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

    return response;
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});