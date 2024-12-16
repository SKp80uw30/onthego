import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not found');
    }

    // Upgrade the connection to WebSocket
    const { socket, response } = Deno.upgradeWebSocket(req);

    // Create WebSocket connection to OpenAI
    const openAIWs = new WebSocket('wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01');
    
    openAIWs.onopen = () => {
      console.log('Connected to OpenAI WebSocket');
      
      // Send initial configuration
      openAIWs.send(JSON.stringify({
        type: 'session.update',
        session: {
          modalities: ["text", "audio"],
          instructions: "You are a helpful assistant that helps users manage their Slack messages. You can read messages, help compose replies, and send messages.",
          voice: "alloy",
          input_audio_format: "pcm16",
          output_audio_format: "pcm16",
          input_audio_transcription: {
            model: "whisper-1"
          },
          turn_detection: {
            type: "server_vad",
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 1000
          },
          tools: [
            {
              type: "function",
              name: "get_slack_messages",
              description: "Get messages from a Slack channel or DM",
              parameters: {
                type: "object",
                properties: {
                  channel: { type: "string" }
                },
                required: ["channel"]
              }
            },
            {
              type: "function",
              name: "send_slack_message",
              description: "Send a message to a Slack channel or DM",
              parameters: {
                type: "object",
                properties: {
                  channel: { type: "string" },
                  message: { type: "string" }
                },
                required: ["channel", "message"]
              }
            }
          ]
        }
      }));
    };

    // Forward messages from client to OpenAI
    socket.onmessage = (event) => {
      if (openAIWs.readyState === WebSocket.OPEN) {
        openAIWs.send(event.data);
      }
    };

    // Forward messages from OpenAI to client
    openAIWs.onmessage = (event) => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(event.data);
      }
    };

    // Handle WebSocket closure
    socket.onclose = () => {
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