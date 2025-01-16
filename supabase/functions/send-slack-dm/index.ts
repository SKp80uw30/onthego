import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function getSlackAccount(supabase) {
  console.log('Fetching Slack account...');
  const { data: slackAccount, error: accountError } = await supabase
    .from('slack_accounts')
    .select('slack_bot_token')
    .limit(1)
    .single();

  if (accountError || !slackAccount?.slack_bot_token) {
    console.error('Error fetching Slack account:', accountError);
    throw new Error('Failed to get Slack account details');
  }

  return slackAccount;
}

async function findDMUser(supabase, identifier: string) {
  console.log('Looking up DM user for identifier:', identifier);
  
  // First try to find user in our database
  const { data: dmUser, error: dbError } = await supabase
    .from('slack_dm_users')
    .select('*')
    .or(`display_name.ilike.${identifier},email.ilike.${identifier}`)
    .eq('is_active', true)
    .single();

  if (dbError) {
    console.error('Error querying slack_dm_users:', dbError);
    throw new Error(`Failed to query user database: ${dbError.message}`);
  }

  if (!dmUser) {
    throw new Error(`User ${identifier} not found in active DM users. Please make sure they are in your Slack workspace and try again.`);
  }

  console.log('Found DM user:', {
    id: dmUser.id,
    display_name: dmUser.display_name,
    slack_user_id: dmUser.slack_user_id
  });

  return dmUser.slack_user_id;
}

async function sendDirectMessage(botToken: string, userId: string, message: string) {
  console.log('Opening DM channel with user:', userId);
  
  // First, open or get the DM channel
  const conversationResponse = await fetch('https://slack.com/api/conversations.open', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${botToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ users: userId }),
  });

  const conversationData = await conversationResponse.json();
  if (!conversationData.ok) {
    console.error('Failed to open DM channel:', conversationData.error);
    throw new Error(`Failed to open DM channel: ${conversationData.error}`);
  }

  const channelId = conversationData.channel.id;

  console.log('Sending message to DM channel:', channelId);
  const response = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${botToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      channel: channelId,
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
    const userId = await findDMUser(supabase, toolArgs.Username);
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