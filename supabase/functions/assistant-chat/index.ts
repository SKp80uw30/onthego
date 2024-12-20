import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, createOpenAIClient, createThread, addMessageToThread, createRun, waitForRunCompletion, getThreadMessages } from './openai-helpers.ts';
import { getCommandParserAssistant, storeThread } from './db-helpers.ts';

serve(async (req) => {
  // Add request logging
  console.log('Received request:', {
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers.entries())
  });

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, message, threadId, slackAccountId } = await req.json();
    console.log('Request payload:', { action, threadId, slackAccountId, messageLength: message?.length });

    // Create OpenAI client with debug logging
    console.log('Initializing OpenAI client...');
    const openai = createOpenAIClient();

    switch (action) {
      case 'CREATE_THREAD': {
        console.log('Processing CREATE_THREAD action for slack account:', slackAccountId);
        
        try {
          const assistantId = await getCommandParserAssistant();
          console.log('Retrieved assistant ID:', assistantId);
          
          const thread = await createThread(openai);
          console.log('Thread created:', thread.id);
          
          await storeThread(thread.id, assistantId, slackAccountId);
          console.log('Thread stored in database');
          
          return new Response(
            JSON.stringify({ threadId: thread.id }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (error) {
          console.error('Detailed error in CREATE_THREAD:', {
            error,
            message: error.message,
            stack: error.stack,
            slackAccountId
          });
          return new Response(
            JSON.stringify({ 
              error: 'Failed to create thread',
              details: error.message,
              type: error.constructor.name
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
          console.error('Missing required parameters:', { threadId, hasMessage: !!message });
          return new Response(
            JSON.stringify({ error: 'Thread ID and message are required' }),
            { 
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }

        try {
          console.log('Processing SEND_MESSAGE action:', { threadId, messageLength: message.length });
          
          const assistantId = await getCommandParserAssistant();
          console.log('Retrieved assistant ID:', assistantId);
          
          await addMessageToThread(openai, threadId, message);
          const run = await createRun(openai, threadId, assistantId);
          await waitForRunCompletion(openai, threadId, run.id);
          
          const messages = await getThreadMessages(openai, threadId);
          const lastMessage = messages.data[0];
          console.log('Retrieved last message:', {
            messageId: lastMessage.id,
            role: lastMessage.role,
            contentLength: lastMessage.content[0].text.value.length
          });

          return new Response(
            JSON.stringify({ 
              response: lastMessage.content[0].text.value,
              status: 'completed'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (error) {
          console.error('Detailed error in SEND_MESSAGE:', {
            error,
            message: error.message,
            stack: error.stack,
            threadId
          });
          return new Response(
            JSON.stringify({ 
              error: 'Failed to process message',
              details: error.message,
              type: error.constructor.name
            }),
            { 
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }
      }

      default:
        console.error('Unknown action received:', action);
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
    }
  } catch (error) {
    console.error('Critical error in assistant-chat function:', {
      error,
      message: error.message,
      stack: error.stack,
      type: error.constructor.name
    });
    return new Response(
      JSON.stringify({ 
        error: error.message,
        type: error.constructor.name,
        details: error.stack
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});