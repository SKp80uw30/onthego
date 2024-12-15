import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

serve(async (req) => {
  console.log('Received request:', req.method);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request');
    return new Response('ok', { headers: corsHeaders });
  }

  // Check if it's a WebSocket upgrade request
  if (req.headers.get("upgrade") === "websocket") {
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

    console.log('Verifying token...');
    // Verify the token
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Token verification failed:', authError);
      return new Response('Invalid authentication token', { 
        status: 401,
        headers: corsHeaders
      });
    }

    console.log('Token verified for user:', user.id);

    try {
      const { socket, response } = Deno.upgradeWebSocket(req);
      
      socket.onopen = () => {
        console.log("WebSocket opened for user:", user.id);
        // Send a test message to confirm connection
        socket.send(JSON.stringify({ type: 'connected', message: 'WebSocket connection established' }));
      };

      socket.onmessage = (event) => {
        console.log("Received message:", event.data);
        // Echo the message back for testing
        socket.send(JSON.stringify({ type: 'echo', message: event.data }));
      };

      socket.onerror = (e) => {
        console.error("WebSocket error:", e);
      };

      socket.onclose = () => {
        console.log("WebSocket closed for user:", user.id);
      };

      return response;
    } catch (error) {
      console.error('Error upgrading to WebSocket:', error);
      return new Response('Failed to establish WebSocket connection', { 
        status: 500,
        headers: corsHeaders
      });
    }
  }

  return new Response('Expected a WebSocket connection', { 
    status: 426,
    headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
  });
});