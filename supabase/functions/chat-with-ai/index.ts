import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { chatWithAI } from './openai-utils.ts';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Received request to chat-with-ai function');
    const { message, slackAccountId, conversationHistory = [] } = await req.json();
    console.log('Request payload:', { message, slackAccountId, historyLength: conversationHistory.length });

    if (!message) {
      console.error('No message provided');
      throw new Error('No message provided');
    }

    if (!slackAccountId) {
      console.error('No Slack account ID provided');
      throw new Error('No Slack account ID provided');
    }

    console.log('Calling OpenAI API...');
    const aiResponse = await chatWithAI(openAIApiKey!, message, conversationHistory);
    console.log('AI Response:', aiResponse);

    return new Response(
      JSON.stringify(aiResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in chat-with-ai function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});