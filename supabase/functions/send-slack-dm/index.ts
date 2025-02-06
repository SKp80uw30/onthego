import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

  return slackAccount;
}

async function lookupSlackUser(token: string, userIdentifier: string) {
  if (!userIdentifier) {
    throw new Error('User identifier is required');
  }

  console.log('Looking up user:', userIdentifier);

  // First try email lookup if it looks like an email
  if (userIdentifier.includes('@')) {
    try {
      const emailResponse = await fetch('https://slack.com/api/users.lookupByEmail', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        method: 'GET',
        body: JSON.stringify({ email: userIdentifier })
      });

      const emailData = await emailResponse.json();
      if (emailData.ok && emailData.user) {
        console.log('Found user by email:', emailData.user.name);
        return emailData.user;
      }
    } catch (error) {
      console.log('Email lookup failed, trying user list');
    }
  }

  // If email lookup fails or it's not an email, try users.list
  const response = await fetch('https://slack.com/api/users.list', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    }
  });

  const data = await response.json();
  if (!data.ok) {
    throw new Error('Failed to fetch users list');
  }

  const user = data.members.find(member => 
    member.profile.display_name === userIdentifier ||
    member.profile.real_name === userIdentifier ||
    member.name === userIdentifier
  );

  if (!user) {
    throw new Error(`No matching user found for "${userIdentifier}"`);
  }

  console.log('Found user:', user.name);
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
    throw new Error('Failed to open DM channel');
  }

  console.log('Opened DM channel:', data.channel.id);
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
    console.log('Processing incoming request...');
    const body = await req.json();
    console.log('Request body:', JSON.stringify(body, null, 2));

    // Extract tool call from VAPI format
    const toolCall = body.message?.toolCalls?.[0];
    if (!toolCall?.function?.name || !toolCall?.function?.arguments) {
      throw new Error('Invalid tool request structure');
    }

    // Parse arguments, handling both string and object formats
    const args = typeof toolCall.function.arguments === 'string' 
      ? JSON.parse(toolCall.function.arguments)
      : toolCall.function.arguments;

    console.log('Parsed arguments:', args);

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
    const slackUser = await lookupSlackUser(slackAccount.slack_bot_token, args.userIdentifier);
    
    // Open DM channel
    const channel = await openDMChannel(slackAccount.slack_bot_token, slackUser.id);
    
    // Send message
    await sendMessage(slackAccount.slack_bot_token, channel.id, args.Message);

    console.log('Successfully completed DM flow');

    return new Response(
      JSON.stringify({
        results: [{
          toolCallId: toolCall.id,
          result: `Message sent successfully to ${slackUser.profile.display_name || slackUser.name}`
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