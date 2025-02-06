import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { logError, logInfo } from './logging.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log('Received request:', body);

    const toolCall = body.message?.toolCalls?.[0];
    const slackAccountId = body.slackAccountId;

    if (!toolCall?.function?.name || !toolCall?.function?.arguments) {
      throw new Error('Invalid tool request structure');
    }

    const args = typeof toolCall.function.arguments === 'string' 
      ? JSON.parse(toolCall.function.arguments)
      : toolCall.function.arguments;

    console.log('Parsed tool arguments:', args);

    if (!args.userIdentifier || !args.Message) {
      throw new Error('Missing required parameters: userIdentifier and Message');
    }

    if (!args.Send_message_approval) {
      return new Response(
        JSON.stringify({
          results: [{
            toolCallId: toolCall.id,
            result: "Message not approved for sending"
          }]
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the specific slack account
    const { data: slackAccount, error: accountError } = await supabase
      .from('slack_accounts')
      .select('*')
      .eq('id', slackAccountId)
      .single();

    if (accountError || !slackAccount) {
      throw new Error('No Slack account found');
    }

    const userToken = slackAccount.slack_user_token;
    if (!userToken) {
      throw new Error('No user token found. Please reconnect your Slack account.');
    }

    // Find the user ID from the identifier
    const { data: dmUsers, error: dmError } = await supabase
      .from('slack_dm_users')
      .select('*')
      .eq('slack_account_id', slackAccountId)
      .eq('is_active', true);

    if (dmError) {
      throw new Error(`Failed to query DM users: ${dmError.message}`);
    }

    const userIdentifier = args.userIdentifier.toLowerCase();
    const user = dmUsers.find(u => 
      (u.display_name && u.display_name.toLowerCase() === userIdentifier) ||
      (u.email && u.email.toLowerCase() === userIdentifier) ||
      u.slack_user_id === userIdentifier
    );

    if (!user) {
      throw new Error(`No matching user found for "${args.userIdentifier}"`);
    }

    // Open a DM channel
    const channelResponse = await fetch('https://slack.com/api/conversations.open', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ users: user.slack_user_id })
    });

    const channelData = await channelResponse.json();
    if (!channelData.ok) {
      throw new Error(`Failed to open DM channel: ${channelData.error}`);
    }

    // Send message as user
    const messageResponse = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel: channelData.channel.id,
        text: args.Message,
        as_user: true
      })
    });

    const messageData = await messageResponse.json();
    if (!messageData.ok) {
      throw new Error(`Failed to send message: ${messageData.error}`);
    }

    console.log('Message sent successfully');

    return new Response(
      JSON.stringify({
        results: [{
          toolCallId: toolCall.id,
          result: `Message sent successfully to ${user.display_name || user.email || user.slack_user_id}`
        }]
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-slack-dm function:', error);
    
    return new Response(
      JSON.stringify({
        results: [{
          toolCallId: body?.message?.toolCalls?.[0]?.id || 'unknown_call_id',
          result: `Error: ${error.message}`
        }]
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});