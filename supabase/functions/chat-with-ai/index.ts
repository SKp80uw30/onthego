import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { chatWithAI } from './openai-utils.ts';
import { fetchSlackMessages } from './slack-utils.ts';

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
    const { message, slackAccountId, command, channelName, conversationHistory = [] } = await req.json();
    console.log('Request payload:', { message, slackAccountId, command, channelName });

    if (command === 'FETCH_MESSAGES') {
      if (!channelName || !slackAccountId) {
        console.error('Missing required parameters:', { channelName, slackAccountId });
        throw new Error('Missing required parameters for fetching messages');
      }

      try {
        const { data: slackAccount } = await supabase
          .from('slack_accounts')
          .select('slack_bot_token')
          .eq('id', slackAccountId)
          .single();

        if (!slackAccount?.slack_bot_token) {
          console.error('No Slack bot token found for account:', slackAccountId);
          throw new Error('Slack account not found or missing bot token');
        }

        console.log('Fetching messages from Slack channel:', channelName);
        const messages = await fetchSlackMessages(channelName, slackAccount.slack_bot_token);
        console.log('Successfully fetched messages:', messages);

        return new Response(
          JSON.stringify({ messages }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (slackError) {
        console.error('Error fetching Slack messages:', slackError);
        throw new Error(`Failed to fetch Slack messages: ${slackError.message}`);
      }
    }

    if (!message) {
      console.error('No message provided');
      throw new Error('No message provided');
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
      JSON.stringify({ 
        error: error.message,
        details: error.stack,
        context: 'chat-with-ai function error'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});