import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function getSlackAccount(supabase: any) {
  const { data, error } = await supabase
    .from('slack_accounts')
    .select('*')
    .limit(1)
    .single();

  if (error) throw new Error(`Failed to get Slack account: ${error.message}`);
  if (!data?.slack_bot_token) throw new Error('No valid Slack token found');
  
  return data;
}

async function findDMUser(supabase: any, slackAccountId: string, identifier: string) {
  const { data: dmUsers, error } = await supabase
    .from('slack_dm_users')
    .select('*')
    .eq('slack_account_id', slackAccountId)
    .eq('is_active', true);

  if (error) throw new Error(`Failed to query DM users: ${error.message}`);

  const normalizedIdentifier = identifier.toLowerCase().trim();
  const user = dmUsers.find(u => 
    (u.display_name?.toLowerCase() === normalizedIdentifier) ||
    (u.email?.toLowerCase() === normalizedIdentifier)
  );

  if (!user) throw new Error(`No matching user found for "${identifier}"`);
  return user;
}

async function verifyBotPermissions(token: string) {
  const response = await fetch('https://slack.com/api/auth.test', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    }
  });

  const data = await response.json();
  if (!data.ok) throw new Error(`Bot permissions test failed: ${data.error}`);
  return data;
}

async function sendMessage(token: string, userId: string, message: string) {
  // First open DM channel
  const channelResponse = await fetch('https://slack.com/api/conversations.open', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ users: userId })
  });

  const channelData = await channelResponse.json();
  if (!channelData.ok) throw new Error(`Failed to open DM channel: ${channelData.error}`);

  // Send message
  const messageResponse = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      channel: channelData.channel.id,
      text: message,
      as_user: true
    })
  });

  const messageData = await messageResponse.json();
  if (!messageData.ok) throw new Error(`Failed to send message: ${messageData.error}`);

  // Verify message was sent
  const verifyResponse = await fetch(`https://slack.com/api/conversations.history?channel=${channelData.channel.id}&limit=1`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    }
  });

  const verifyData = await verifyResponse.json();
  if (!verifyData.ok || !verifyData.messages?.length) {
    throw new Error('Message sent but not found in channel history');
  }

  return messageData;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log('Received request:', body);

    const toolCall = body.message?.toolCalls?.[0];
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

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const slackAccount = await getSlackAccount(supabase);
    await verifyBotPermissions(slackAccount.slack_bot_token);
    
    const slackUser = await findDMUser(supabase, slackAccount.id, args.userIdentifier);
    await sendMessage(slackAccount.slack_bot_token, slackUser.slack_user_id, args.Message);

    console.log('Message sent successfully');

    return new Response(
      JSON.stringify({
        results: [{
          toolCallId: toolCall.id,
          result: `Message sent successfully to ${slackUser.display_name || slackUser.email}`
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