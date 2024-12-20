import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, createOpenAIClient, createThread, addMessageToThread, createRun, waitForRunCompletion, getThreadMessages } from './openai-helpers.ts';
import { getCommandParserAssistant, storeThread } from './db-helpers.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, message, threadId, slackAccountId } = await req.json();
    console.log('Received request:', { action, threadId, slackAccountId });

    const openai = createOpenAIClient();

    switch (action) {
      case 'CREATE_THREAD': {
        console.log('Creating new thread for slack account:', slackAccountId);
        
        try {
          const assistantId = await getCommandParserAssistant();
          const thread = await createThread(openai);
          
          await storeThread(thread.id, assistantId, slackAccountId);
          
          return new Response(
            JSON.stringify({ threadId: thread.id }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (error) {
          console.error('Error in CREATE_THREAD:', error);
          return new Response(
            JSON.stringify({ 
              error: 'Failed to create thread',
              details: error.message 
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

        try {
          console.log('Processing message for thread:', threadId);
          
          const assistantId = await getCommandParserAssistant();
          
          await addMessageToThread(openai, threadId, message);
          const run = await createRun(openai, threadId, assistantId);
          await waitForRunCompletion(openai, threadId, run.id);
          
          const messages = await getThreadMessages(openai, threadId);
          const lastMessage = messages.data[0];

          return new Response(
            JSON.stringify({ 
              response: lastMessage.content[0].text.value,
              status: 'completed'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (error) {
          console.error('Error in SEND_MESSAGE:', error);
          return new Response(
            JSON.stringify({ 
              error: 'Failed to process message',
              details: error.message 
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