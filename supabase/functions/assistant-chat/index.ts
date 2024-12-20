import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';
import OpenAI from "npm:openai@4.26.0";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

const openai = new OpenAI({
  apiKey: openAIApiKey,
  baseOptions: {
    headers: {
      'OpenAI-Beta': 'assistants=v2'
    }
  }
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, message, threadId, slackAccountId } = await req.json();
    console.log('Received request:', { action, threadId, slackAccountId });

    switch (action) {
      case 'CREATE_THREAD': {
        console.log('Creating new thread for slack account:', slackAccountId);
        
        // Get the command parser assistant ID from the database
        const { data: commandParserAssistant, error: assistantError } = await supabase
          .from('assistants')
          .select('openai_assistant_id')
          .eq('assistant_type', 'command_parser')
          .single();

        if (assistantError || !commandParserAssistant) {
          console.error('Command parser assistant not found:', assistantError);
          return new Response(
            JSON.stringify({ error: 'Command parser assistant not found' }),
            { 
              status: 404,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }

        console.log('Found command parser assistant:', commandParserAssistant);

        try {
          // Create a new thread with explicit beta header
          const thread = await openai.beta.threads.create();
          console.log('Created new thread:', thread.id);

          // Store the thread in our database
          const { error: threadError } = await supabase
            .from('assistant_threads')
            .insert({
              openai_thread_id: thread.id,
              assistant_id: commandParserAssistant.openai_assistant_id,
              session_id: slackAccountId
            });

          if (threadError) {
            console.error('Error storing thread:', threadError);
            return new Response(
              JSON.stringify({ error: `Error storing thread: ${threadError.message}` }),
              { 
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            );
          }

          return new Response(
            JSON.stringify({ threadId: thread.id }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (error) {
          console.error('OpenAI API error:', error);
          return new Response(
            JSON.stringify({ 
              error: `OpenAI API error: ${error.message}`,
              details: error
            }),
            { 
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }
      }

      case 'SEND_MESSAGE': {
        if (!threadId || !message) {
          return new Response(
            JSON.stringify({ error: 'Thread ID and message are required' }),
            { 
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }

        console.log('Sending message to thread:', threadId);

        try {
          // Add the message to the thread with explicit beta header
          await openai.beta.threads.messages.create(threadId, {
            role: 'user',
            content: message
          });

          // Get the current assistant for this thread
          const { data: threadData, error: threadError } = await supabase
            .from('assistant_threads')
            .select('assistant_id')
            .eq('openai_thread_id', threadId)
            .single();

          if (threadError || !threadData) {
            console.error('Thread not found in database:', threadError);
            return new Response(
              JSON.stringify({ error: 'Thread not found in database' }),
              { 
                status: 404,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            );
          }

          // Run the assistant with explicit beta header
          const run = await openai.beta.threads.runs.create(threadId, {
            assistant_id: threadData.assistant_id
          });

          // Wait for the run to complete
          let runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
          while (runStatus.status === 'queued' || runStatus.status === 'in_progress') {
            await new Promise(resolve => setTimeout(resolve, 1000));
            runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
          }

          // Get the assistant's response with explicit beta header
          const messages = await openai.beta.threads.messages.list(threadId);
          const lastMessage = messages.data[0];

          return new Response(
            JSON.stringify({ 
              response: lastMessage.content[0].text.value,
              status: runStatus.status
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (error) {
          console.error('OpenAI API error:', error);
          return new Response(
            JSON.stringify({ 
              error: `OpenAI API error: ${error.message}`,
              details: error
            }),
            { 
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
    }
  } catch (error) {
    console.error('Error in assistant-chat function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});