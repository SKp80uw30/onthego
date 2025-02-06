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

function normalizeString(str: string): string {
  return str.toLowerCase()
    .replace(/\s+/g, '') // Remove all whitespace
    .replace(/[^a-z0-9]/g, ''); // Remove special characters
}

function calculateSimilarity(str1: string, str2: string): number {
  const norm1 = normalizeString(str1);
  const norm2 = normalizeString(str2);
  
  // Check for exact match after normalization
  if (norm1 === norm2) return 1;
  
  // Check if one is contained within the other
  if (norm1.includes(norm2) || norm2.includes(norm1)) return 0.8;
  
  return 0;
}

async function findDMUser(supabase, identifier: string) {
  console.log('Looking up DM user for identifier:', identifier);
  
  // Get all active DM users
  const { data: dmUsers, error: dbError } = await supabase
    .from('slack_dm_users')
    .select('*')
    .eq('is_active', true);

  if (dbError) {
    console.error('Error querying slack_dm_users:', dbError);
    throw new Error(`Failed to query user database: ${dbError.message}`);
  }

  if (!dmUsers || dmUsers.length === 0) {
    throw new Error('No active DM users found');
  }

  // Find the best match
  let bestMatch = null;
  let bestSimilarity = 0;

  for (const user of dmUsers) {
    const displayNameSimilarity = user.display_name ? 
      calculateSimilarity(identifier, user.display_name) : 0;
    const emailSimilarity = user.email ? 
      calculateSimilarity(identifier, user.email) : 0;

    const similarity = Math.max(displayNameSimilarity, emailSimilarity);

    if (similarity > bestSimilarity) {
      bestSimilarity = similarity;
      bestMatch = user;
    }
  }

  // Require a minimum similarity threshold
  if (bestSimilarity >= 0.8 && bestMatch) {
    console.log('Found matching DM user:', {
      id: bestMatch.id,
      display_name: bestMatch.display_name,
      slack_user_id: bestMatch.slack_user_id,
      similarity: bestSimilarity
    });
    return bestMatch.slack_user_id;
  }

  throw new Error(`No matching user found for "${identifier}". Please try with their exact Slack display name or email.`);
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