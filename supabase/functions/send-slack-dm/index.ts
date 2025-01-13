import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function getSlackAccount(supabase) {
  console.log('Fetching Slack account...');
  const { data: slackAccount, error: accountError } = await supabase
    .from('slack_accounts')
    .select('*')
    .limit(1)
    .single();

  if (accountError || !slackAccount?.slack_bot_token) {
    console.error('Error fetching Slack account:', accountError);
    throw new Error('Failed to get Slack account');
  }

  return slackAccount;
}

async function findUserId(botToken: string, identifier: string) {
  console.log('Looking up user ID for identifier:', identifier);
  const response = await fetch('https://slack.com/api/users.list', {
    headers: {
      'Authorization': `Bearer ${botToken}`,
    },
  });

  const data = await response.json();
  if (!data.ok) {
    console.error('Slack API error:', data.error);
    throw new Error(`Slack API error: ${data.error}`);
  }

  // Try to match by email first, then by display name, then by real name
  const user = data.members.find(member => 
    member.profile?.email === identifier || 
    member.name === identifier || 
    member.profile?.display_name === identifier ||
    member.profile?.real_name === identifier
  );

  if (!user) {
    throw new Error(`User ${identifier} not found. Please try using their Slack email address or @username`);
  }

  console.log('Found user:', {
    id: user.id,
    name: user.name,
    real_name: user.profile?.real_name,
    email: user.profile?.email
  });

  return user.id;
}

async function sendDirectMessage(botToken: string, userId: string, message: string) {
  console.log('Sending DM to user:', userId);
  const response = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${botToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      channel: userId,
      text: message,
    }),
  });

  const result = await response.json();
  if (!result.ok) {
    console.error('Failed to send DM:', result.error);
    throw new Error(`Failed to send DM: ${result.error}`);
  }

  return result;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json();
    console.log('Received request:', JSON.stringify(body, null, 2));

    const toolCall = body.message?.toolCalls?.[0];
    if (!toolCall?.function?.name || !toolCall?.function?.arguments) {
      throw new Error('Invalid tool request structure');
    }

    const toolArgs = typeof toolCall.function.arguments === 'string' 
      ? JSON.parse(toolCall.function.arguments)
      : toolCall.function.arguments;

    console.log('Parsed tool arguments:', toolArgs);

    if (!toolArgs.Send_message_approval) {
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

    const slackAccount = await getSlackAccount(supabase);
    const userId = await findUserId(slackAccount.slack_bot_token, toolArgs.Username);
    const result = await sendDirectMessage(slackAccount.slack_bot_token, userId, toolArgs.Message);

    console.log('Message sent successfully:', result);

    return new Response(
      JSON.stringify({
        results: [{
          toolCallId: toolCall.id,
          result: `Message sent successfully to ${toolArgs.Username}`
        }]
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-slack-dm function:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    
    return new Response(
      JSON.stringify({
        results: [{
          toolCallId: body?.message?.toolCalls?.[0]?.id || 'unknown_call_id',
          result: `Error: ${error.message}`
        }]
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});