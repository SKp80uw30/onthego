import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import OpenAI from "npm:openai@4.26.0";

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
    const { action, threadId, message } = await req.json();
    console.log('Request received:', { action, threadId, messageLength: message?.length });

    // Initialize OpenAI with explicit beta configuration
    const openai = new OpenAI({
      apiKey: Deno.env.get('OPENAI_API_KEY'),
      defaultHeaders: { 'OpenAI-Beta': 'assistants=v2' }
    });

    // Test the OpenAI connection first
    try {
      console.log('Testing OpenAI connection...');
      const assistants = await openai.beta.assistants.list();
      console.log('Available assistants:', assistants.data.map(a => ({ id: a.id, name: a.name })));
    } catch (error) {
      console.error('Error testing OpenAI connection:', error);
      throw error;
    }

    switch (action) {
      case 'CREATE_THREAD': {
        console.log('Creating new thread');
        const thread = await openai.beta.threads.create();
        console.log('Thread created:', thread.id);

        return new Response(
          JSON.stringify({ threadId: thread.id }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'SEND_MESSAGE': {
        if (!threadId || !message) {
          throw new Error('Thread ID and message are required');
        }

        console.log('Adding message to thread:', threadId);
        await openai.beta.threads.messages.create(threadId, {
          role: 'user',
          content: message
        });

        console.log('Creating run with assistant');
        const run = await openai.beta.threads.runs.create(threadId, {
          assistant_id: "asst_LBYQQezR9PxDETVriDGzHuW5"
        });

        console.log('Waiting for run completion');
        let runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
        
        while (runStatus.status === 'queued' || runStatus.status === 'in_progress') {
          await new Promise(resolve => setTimeout(resolve, 1000));
          runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
          console.log('Run status:', runStatus.status);
        }

        const messages = await openai.beta.threads.messages.list(threadId);
        const lastMessage = messages.data[0];

        return new Response(
          JSON.stringify({ 
            response: lastMessage.content[0].text.value,
            status: runStatus.status
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error('Error in assistant-chat function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});