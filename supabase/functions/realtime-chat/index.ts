import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

console.log('Edge Function initialized');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request');
    return new Response('ok', { headers: corsHeaders });
  }

  // Check if it's a WebSocket upgrade request
  if (req.headers.get("upgrade") !== "websocket") {
    console.log('Not a WebSocket upgrade request');
    return new Response('Expected WebSocket upgrade', { 
      status: 426,
      headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
    });
  }

  try {
    console.log('Processing WebSocket upgrade request');
    
    // Get the token from URL parameters
    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    
    if (!token) {
      console.error('No authentication token provided');
      return new Response('No authentication token provided', { 
        status: 401,
        headers: corsHeaders
      });
    }

    // Verify the token
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Token verification failed:', authError);
      return new Response('Invalid authentication token', { 
        status: 401,
        headers: corsHeaders
      });
    }

    console.log('Token verified for user:', user.id);

    // Upgrade the connection to WebSocket
    const { socket, response } = Deno.upgradeWebSocket(req);
    
    socket.onopen = () => {
      console.log('WebSocket opened for user:', user.id);
      socket.send(JSON.stringify({ 
        type: 'connected',
        userId: user.id 
      }));
    };

    socket.onmessage = async (event) => {
      try {
        console.log('Received message from user:', user.id);
        const data = JSON.parse(event.data);
        console.log('Message data:', data);
        
        // Echo the message back for testing
        socket.send(JSON.stringify({
          type: 'echo',
          data: data,
          userId: user.id
        }));
      } catch (error) {
        console.error('Error processing message:', error);
        socket.send(JSON.stringify({
          type: 'error',
          message: 'Failed to process message'
        }));
      }
    };

    socket.onerror = (e) => {
      console.error('WebSocket error for user:', user.id, e);
    };

    socket.onclose = () => {
      console.log('WebSocket closed for user:', user.id);
    };

    return response;
  } catch (error) {
    console.error('Error handling WebSocket connection:', error);
    return new Response('Internal Server Error', { 
      status: 500,
      headers: corsHeaders
    });
  }
});