import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VapiToolCall {
  message: {
    toolCalls: [{
      function: {
        name: string;
        arguments: string | {
          userIdentifier: string;
          Message: string;
          Send_message_approval: boolean;
        };
      };
    }];
  };
}

async function getSlackAccount(supabase: any) {
  console.log('Fetching Slack account...');
  const { data: slackAccount, error: accountError } = await supabase
    .from('slack_accounts')
    .select('*')
    .limit(1)
    .single();

  if (accountError || !slackAccount?.slack_bot_token) {
    console.error('Error fetching Slack account:', accountError);
    throw new Error('Failed to get Slack account details');
  }

  console.log('Successfully retrieved Slack account with workspace:', slackAccount.slack_workspace_name);
  return slackAccount;
}

async function findDMUser(supabase: any, slackAccountId: string, userIdentifier: string) {
  console.log('Looking up DM user with identifier:', userIdentifier);
  
  if (!userIdentifier) {
    throw new Error('User identifier is required');
  }

  const { data: dmUsers, error } = await supabase
    .from('slack_dm_users')
    .select('*')
    .eq('slack_account_id', slackAccountId)
    .eq('is_active', true);

  if (error) {
    console.error('Error querying DM users:', error);
    throw new Error(`Failed to query DM users: ${error.message}`);
  }

  console.log(`Found ${dmUsers.length} active DM users`);

  const normalizedIdentifier = userIdentifier.toLowerCase().trim();
  const user = dmUsers.find(u => 
    (u.display_name && u.display_name.toLowerCase() === normalizedIdentifier) ||
    (u.email && u.email.toLowerCase() === normalizedIdentifier)
  );

  if (!user) {
    console.error('No matching user found for identifier:', userIdentifier);
    throw new Error(`No matching user found for "${userIdentifier}". Available users: ${dmUsers.map(u => u.display_name || u.email).join(', ')}`);
  }

  console.log('Found matching user:', { 
    userId: user.slack_user_id,
    displayName: user.display_name,
    email: user.email 
  });

  return user;
}

async function openDMChannel(token: string, userId: string) {
  console.log('Opening DM channel with user:', userId);
  
  const response = await fetch('https://slack.com/api/conversations.open', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ users: userId })
  });

  const data = await response.json();
  if (!data.ok || !data.channel) {
    console.error('Failed to open DM channel:', data.error);
    throw new Error('Failed to open DM channel');
  }

  console.log('Successfully opened DM channel:', data.channel.id);
  return data.channel;
}

async function sendMessage(token: string, channelId: string, message: string) {
  console.log('Sending message to channel:', channelId);
  
  const response = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      channel: channelId,
      text: message,
    })
  });

  const data = await response.json();
  if (!data.ok) {
    console.error('Failed to send message:', data.error);
    throw new Error('Failed to send message');
  }

  console.log('Message sent successfully');
  return data;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: VapiToolCall = await req.json();
    console.log('Received request:', JSON.stringify(body, null, 2));

    const toolCall = body.message?.toolCalls?.[0];
    if (!toolCall?.function?.name || !toolCall?.function?.arguments) {
      throw new Error('Invalid tool request structure');
    }

    // Parse arguments, handling both string and object formats
    const args = typeof toolCall.function.arguments === 'string' 
      ? JSON.parse(toolCall.function.arguments)
      : toolCall.function.arguments;

    console.log('Parsed tool arguments:', JSON.stringify(args, null, 2));

    // Validate required parameters
    if (!args.userIdentifier || !args.Message) {
      throw new Error('Missing required parameters: userIdentifier and Message');
    }

    // Check message approval
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

    // Get Slack account and validate bot token
    const slackAccount = await getSlackAccount(supabase);
    
    // Lookup Slack user
    const slackUser = await findDMUser(supabase, slackAccount.id, args.userIdentifier);
    
    // Open DM channel
    const channel = await openDMChannel(slackAccount.slack_bot_token, slackUser.slack_user_id);
    
    // Send message
    await sendMessage(slackAccount.slack_bot_token, channel.id, args.Message);

    console.log('Successfully completed DM flow');

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