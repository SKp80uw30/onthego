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

async function getUserId(botToken: string, username: string) {
  console.log('Looking up user ID for username:', username);
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

  const user = data.members.find(member => 
    member.name === username || 
    member.profile?.display_name === username ||
    member.profile?.real_name === username
  );

  if (!user) {
    throw new Error(`User ${username} not found`);
  }

  return user.id;
}

async function fetchDirectMessages(botToken: string, userId: string, limit: number, unreadOnly: boolean) {
  console.log('Fetching DMs with params:', { userId, limit, unreadOnly });
  
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

  // Then fetch messages from this channel
  const messagesResponse = await fetch(`https://slack.com/api/conversations.history`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${botToken}`,
    },
  });

  const messagesData = await messagesResponse.json();
  if (!messagesData.ok) {
    console.error('Failed to fetch messages:', messagesData.error);
    throw new Error(`Failed to fetch messages: ${messagesData.error}`);
  }

  let messages = messagesData.messages || [];
  
  // Filter for unread if specified
  if (unreadOnly) {
    // Get unread messages using conversations.mark as reference
    const unreadResponse = await fetch(`https://slack.com/api/conversations.mark`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel: channelId,
        ts: messages[0]?.ts // Mark the latest message as read to get unread count
      })
    });

    const unreadData = await unreadResponse.json();
    if (!unreadData.ok) {
      console.error('Failed to get unread status:', unreadData.error);
      // Don't throw here, just log the error and continue with all messages
    } else {
      messages = messages.filter(msg => !msg.is_read);
    }
  }

  // Limit the number of messages
  messages = messages.slice(0, limit);

  console.log('Successfully fetched messages:', {
    total: messages.length,
    unreadOnly,
    channelId
  });

  return messages.map(msg => msg.text);
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

    const slackAccount = await getSlackAccount(supabase);
    const userId = await getUserId(slackAccount.slack_bot_token, toolArgs.Username);
    const messages = await fetchDirectMessages(
      slackAccount.slack_bot_token,
      userId,
      toolArgs.Number_fetch_messages,
      toolArgs.Unread_only
    );

    return new Response(
      JSON.stringify({
        results: [{
          toolCallId: toolCall.id,
          result: {
            Messages: messages
          }
        }]
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in fetch-slack-dms function:', error);
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