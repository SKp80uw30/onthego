import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';
import { chatWithAI } from './openai-utils.ts';
import { fetchSlackMessages, sendSlackMessage } from './slack-utils.ts';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

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

    if (!openAIApiKey) {
      console.error('OpenAI API key not found');
      throw new Error('OpenAI API key not configured');
    }

    if (command === 'FETCH_MESSAGES') {
      if (!channelName || !slackAccountId) {
        console.error('Missing required parameters:', { channelName, slackAccountId });
        throw new Error('Missing required parameters for fetching messages');
      }

      try {
        console.log('Fetching Slack account details...');
        const { data: slackAccount, error: accountError } = await supabase
          .from('slack_accounts')
          .select('slack_bot_token')
          .eq('id', slackAccountId)
          .single();

        if (accountError || !slackAccount?.slack_bot_token) {
          console.error('Error fetching Slack account:', { accountError, slackAccountId });
          throw new Error('Slack account not found or missing bot token');
        }

        const messages = await fetchSlackMessages(channelName, slackAccount.slack_bot_token);
        console.log('Successfully fetched messages:', messages);

        return new Response(
          JSON.stringify({ messages }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (slackError) {
        console.error('Error in Slack operation:', slackError);
        return new Response(
          JSON.stringify({ 
            error: 'Slack operation failed', 
            details: slackError.message,
            status: 'error'
          }),
          { 
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }

    if (!message) {
      console.error('No message provided');
      throw new Error('No message provided');
    }

    try {
      console.log('Calling OpenAI API...');
      const aiResponse = await chatWithAI(openAIApiKey, message, conversationHistory);
      console.log('AI Response:', aiResponse);

      // If there's a confirmed message to send, send it
      if (aiResponse.action === 'SEND_MESSAGE' && aiResponse.confirmed && slackAccountId) {
        const { data: slackAccount } = await supabase
          .from('slack_accounts')
          .select('slack_bot_token')
          .eq('id', slackAccountId)
          .single();

        if (slackAccount?.slack_bot_token) {
          await sendSlackMessage(
            aiResponse.channelName!,
            aiResponse.messageContent!,
            slackAccount.slack_bot_token
          );
        }
      }

      return new Response(
        JSON.stringify(aiResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      console.error('OpenAI API error:', error);
      
      if (error.message?.includes('insufficient_quota')) {
        return new Response(
          JSON.stringify({
            error: 'Service temporarily unavailable due to quota limits. Please try again later.',
            status: 'quota_exceeded'
          }),
          { 
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          error: error.message,
          details: error.stack,
          status: 'error'
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
  } catch (error) {
    console.error('Error in chat-with-ai function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message,
        status: 'error'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});