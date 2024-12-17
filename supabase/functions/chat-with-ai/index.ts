import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { chatWithAI } from './openai-utils.ts';
import { fetchSlackMessages, sendSlackMessage } from './slack-utils.ts';

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
    const { message, slackAccountId, conversationHistory = [] } = await req.json();
    console.log('Received message:', message);
    console.log('Conversation history:', conversationHistory);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get Slack account details
    const { data: slackAccount } = await supabase
      .from('slack_accounts')
      .select('*')
      .eq('id', slackAccountId)
      .single();

    if (!slackAccount) {
      throw new Error('Slack account not found');
    }

    // Process AI response
    const aiResponse = await chatWithAI(openAIApiKey!, conversationHistory);
    console.log('AI Response:', aiResponse);

    // Handle Slack interactions based on AI response
    if (aiResponse.includes('FETCH_MESSAGES')) {
      const channelName = aiResponse.match(/FETCH_MESSAGES:(\w+)/)[1];
      const { channelId, messages } = await fetchSlackMessages(
        channelName,
        slackAccount.slack_bot_token
      );

      // Add fetched messages to conversation
      conversationHistory.push(
        { role: 'assistant', content: aiResponse },
        { role: 'system', content: `Here are the recent messages from #${channelName}:\n${messages}` }
      );

      // Get AI's response about the fetched messages
      const followUpResponse = await chatWithAI(openAIApiKey!, conversationHistory);

      return new Response(
        JSON.stringify({
          response: followUpResponse,
          conversationHistory: [
            ...conversationHistory,
            { role: 'assistant', content: followUpResponse }
          ],
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else if (aiResponse.includes('SEND_MESSAGE')) {
      // Only proceed if the message contains explicit confirmation
      if (!aiResponse.includes('CONFIRMED')) {
        return new Response(
          JSON.stringify({
            response: aiResponse,
            conversationHistory: [
              ...conversationHistory,
              { role: 'assistant', content: aiResponse }
            ],
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const match = aiResponse.match(/SEND_MESSAGE:(\w+):(.+)/);
      if (!match) {
        throw new Error('Invalid send message format');
      }

      const [, channelName, messageContent] = match;
      const { channelId } = await fetchSlackMessages(
        channelName,
        slackAccount.slack_bot_token
      );

      await sendSlackMessage(
        channelId,
        messageContent,
        slackAccount.slack_bot_token
      );

      return new Response(
        JSON.stringify({
          response: `Message sent successfully to #${channelName}`,
          conversationHistory: [
            ...conversationHistory,
            { role: 'assistant', content: aiResponse },
            { role: 'system', content: `Message sent successfully to #${channelName}` }
          ],
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        response: aiResponse,
        conversationHistory: [
          ...conversationHistory,
          { role: 'assistant', content: aiResponse }
        ],
      }),
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