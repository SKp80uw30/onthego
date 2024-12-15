import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

    console.log('Upgrading connection to WebSocket');
    // Upgrade the request to a WebSocket connection
    const { response, socket } = Deno.upgradeWebSocket(req);

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

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
          "instructions": "You are a helpful assistant that can interact with Slack. You can retrieve messages and post new messages.",
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
          },
          "tools": [
            {
              "type": "function",
              "name": "get_slack_messages",
              "description": "Retrieve messages from Slack DMs",
              "parameters": {
                "type": "object",
                "properties": {
                  "channel": { "type": "string" }
                },
                "required": ["channel"]
              }
            },
            {
              "type": "function",
              "name": "send_slack_message",
              "description": "Send a message to Slack",
              "parameters": {
                "type": "object",
                "properties": {
                  "message": { "type": "string" },
                  "channel": { "type": "string" }
                },
                "required": ["message", "channel"]
              }
            }
          ],
          "tool_choice": "auto"
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
      const data = JSON.parse(event.data);
      
      if (data.type === 'function_call') {
        // Handle function calls
        const { name, arguments: args } = data;
        
        try {
          if (name === 'get_slack_messages') {
            // Implementation for getting Slack messages
            const { data: slackAccount } = await supabase
              .from('slack_accounts')
              .select('*')
              .single();

            if (!slackAccount) {
              throw new Error('No Slack account found');
            }

            // Call Slack API to get messages
            const response = await fetch(`https://slack.com/api/conversations.history`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${slackAccount.slack_bot_token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                channel: args.channel,
                limit: 10
              }),
            });

            const messages = await response.json();
            return messages;
          }
          
          if (name === 'send_slack_message') {
            // Implementation for sending Slack messages
            const { data: slackAccount } = await supabase
              .from('slack_accounts')
              .select('*')
              .single();

            if (!slackAccount) {
              throw new Error('No Slack account found');
            }

            const response = await fetch('https://slack.com/api/chat.postMessage', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${slackAccount.slack_bot_token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                channel: args.channel,
                text: args.message,
              }),
            });

            return await response.json();
          }
        } catch (error) {
          console.error('Error executing function:', error);
          socket.send(JSON.stringify({
            type: 'function_error',
            error: error.message
          }));
        }
      } else {
        // Forward other messages to OpenAI
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