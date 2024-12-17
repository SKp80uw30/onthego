import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

    // Prepare system message based on available Slack token
    const systemMessage = `You are a helpful AI assistant that helps users manage their Slack messages. You can:
1. Fetch messages from Slack channels when asked
2. Help compose and review messages before sending them to Slack
3. Send messages to specific Slack channels after user confirmation

Always maintain context of the conversation and be clear about which channel you're working with.
When sending messages, always confirm with the user and specify the target channel.`;

    // Call OpenAI API
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemMessage },
          ...conversationHistory,
          { role: 'user', content: message }
        ],
      }),
    });

    if (!openAIResponse.ok) {
      const error = await openAIResponse.json();
      throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
    }

    const aiData = await openAIResponse.json();
    const aiResponse = aiData.choices[0].message.content;

    // If AI response contains a command to fetch or send Slack messages
    if (aiResponse.includes('FETCH_MESSAGES')) {
      // Fetch messages from specified channel
      const channelName = aiResponse.match(/FETCH_MESSAGES:(\w+)/)[1];
      
      // Get channel ID
      const channelListResponse = await fetch('https://slack.com/api/conversations.list', {
        headers: {
          'Authorization': `Bearer ${slackAccount.slack_bot_token}`,
        },
      });
      
      const channels = await channelListResponse.json();
      const channel = channels.channels.find((c: any) => c.name === channelName);
      
      if (!channel) {
        throw new Error(`Channel ${channelName} not found`);
      }

      // Fetch messages
      const messagesResponse = await fetch(`https://slack.com/api/conversations.history?channel=${channel.id}&limit=5`, {
        headers: {
          'Authorization': `Bearer ${slackAccount.slack_bot_token}`,
        },
      });

      const messages = await messagesResponse.json();
      const formattedMessages = messages.messages
        .map((msg: any) => `Message: ${msg.text}`)
        .join('\n');

      // Add fetched messages to conversation
      conversationHistory.push({ role: 'assistant', content: aiResponse });
      conversationHistory.push({ role: 'system', content: `Here are the recent messages from #${channelName}:\n${formattedMessages}` });

      // Get AI's response about the fetched messages
      const followUpResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemMessage },
            ...conversationHistory,
          ],
        }),
      });

      const followUpData = await followUpResponse.json();
      const followUpMessage = followUpData.choices[0].message.content;

      return new Response(
        JSON.stringify({
          response: followUpMessage,
          conversationHistory: [
            ...conversationHistory,
            { role: 'assistant', content: followUpMessage }
          ],
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else if (aiResponse.includes('SEND_MESSAGE')) {
      // Extract channel and message from AI response
      const match = aiResponse.match(/SEND_MESSAGE:(\w+):(.+)/);
      if (!match) {
        throw new Error('Invalid send message format');
      }

      const [, channelName, messageContent] = match;

      // Get channel ID
      const channelListResponse = await fetch('https://slack.com/api/conversations.list', {
        headers: {
          'Authorization': `Bearer ${slackAccount.slack_bot_token}`,
        },
      });
      
      const channels = await channelListResponse.json();
      const channel = channels.channels.find((c: any) => c.name === channelName);
      
      if (!channel) {
        throw new Error(`Channel ${channelName} not found`);
      }

      // Send message to Slack
      const sendMessageResponse = await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${slackAccount.slack_bot_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channel: channel.id,
          text: messageContent,
        }),
      });

      if (!sendMessageResponse.ok) {
        throw new Error('Failed to send message to Slack');
      }

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