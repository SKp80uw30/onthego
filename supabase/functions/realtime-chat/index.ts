import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

console.log('[Edge Function] Starting realtime-chat function...');

serve(async (req) => {
  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] Received request:`, {
    method: req.method,
    url: req.url,
  });

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log(`[${requestId}] Handling CORS preflight request`);
    return new Response(null, { 
      status: 204,
      headers: {
        ...corsHeaders,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      }
    });
  }

  try {
    // Check if it's a WebSocket upgrade request
    const upgradeHeader = req.headers.get("upgrade") || '';
    console.log(`[${requestId}] Upgrade header:`, upgradeHeader);
    
    if (upgradeHeader.toLowerCase() !== "websocket") {
      console.log(`[${requestId}] Not a WebSocket upgrade request`);
      return new Response('Expected WebSocket upgrade', { 
        status: 426,
        headers: { ...corsHeaders }
      });
    }

    // Get the token from URL parameters
    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    console.log(`[${requestId}] Token present:`, !!token);
    
    if (!token) {
      console.error(`[${requestId}] No authentication token provided`);
      return new Response('No authentication token provided', { 
        status: 403,
        headers: corsHeaders
      });
    }

    // Verify the token
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log(`[${requestId}] Verifying token...`);
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
    console.log(`[${requestId}] WebSocket connection upgraded successfully`);
    
    socket.onopen = () => {
      console.log(`[${requestId}] WebSocket opened for user:`, user.id);
      socket.send(JSON.stringify({ 
        type: 'connected',
        userId: user.id 
      }));
    };

    socket.onmessage = async (event) => {
      try {
        console.log(`[${requestId}] Received message from user:`, user.id);
        const data = JSON.parse(event.data);
        console.log(`[${requestId}] Message data:`, data);
        
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
      console.error(`[${requestId}] WebSocket error for user:`, user.id, e);
    };

    socket.onclose = () => {
      console.log(`[${requestId}] WebSocket closed for user:`, user.id);
    };

    return response;
  } catch (error) {
    console.error(`[${requestId}] Error handling WebSocket connection:`, error);
    return new Response('Internal Server Error', { 
      status: 500,
      headers: corsHeaders
    });
  }
});