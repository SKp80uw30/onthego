import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] Incoming request to realtime-chat function`);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  // Check for WebSocket upgrade
  const upgradeHeader = req.headers.get("upgrade") || '';
  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response('Expected WebSocket upgrade', { 
      status: 426,
      headers: corsHeaders
    });
  }

  // Get and verify token
  const url = new URL(req.url);
  const token = url.searchParams.get('token');
  
  if (!token) {
    console.error(`[${requestId}] No authentication token provided`);
    return new Response('No authentication token provided', { 
      status: 403,
      headers: corsHeaders
    });
  }

  // Verify the token
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  
  if (authError || !user) {
    console.error(`[${requestId}] Token verification failed:`, authError);
    return new Response('Invalid authentication token', { 
      status: 401,
      headers: corsHeaders
    });
  }

  console.log(`[${requestId}] Token verified for user:`, user.id);

  // Upgrade the connection to WebSocket
  const { socket, response } = Deno.upgradeWebSocket(req);
  
  socket.onopen = () => {
    console.log(`[${requestId}] WebSocket opened for user:`, user.id);
    socket.send(JSON.stringify({ 
      type: 'connected',
      userId: user.id 
    }));
  };

  socket.onmessage = async (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log(`[${requestId}] Received message from user ${user.id}:`, data);
      
      // Echo the message back for now
      socket.send(JSON.stringify({
        type: 'echo',
        data: data,
        userId: user.id,
        timestamp: new Date().toISOString()
      }));
    } catch (error) {
      console.error(`[${requestId}] Error processing message:`, error);
      socket.send(JSON.stringify({
        type: 'error',
        message: 'Failed to process message'
      }));
    }
  };

  socket.onerror = (e) => {
    console.error(`[${requestId}] WebSocket error for user ${user.id}:`, e);
  };

  socket.onclose = () => {
    console.log(`[${requestId}] WebSocket closed for user:`, user.id);
  };

  return response;
});