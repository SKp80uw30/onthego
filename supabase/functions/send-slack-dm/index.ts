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
  if (!str) {
    console.warn('Received empty or undefined string for normalization');
    return '';
  }
  return str.toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function calculateSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) {
    console.warn('Received empty strings for similarity calculation', { str1, str2 });
    return 0;
  }
  
  const norm1 = normalizeString(str1);
  const norm2 = normalizeString(str2);
  
  if (norm1 === norm2) return 1;
  if (norm1.includes(norm2) || norm2.includes(norm1)) return 0.8;
  return 0;
}

async function findDMUser(supabase, identifier: string) {
  console.log('Looking up DM user for identifier:', identifier);
  
  if (!identifier) {
    throw new Error('User identifier is required');
  }

  const { data: dmUsers, error: dbError } = await supabase
    .from('slack_dm_users')
    .select('*')
    .eq('is_active', true);

  if (dbError) {
    console.error('Error querying slack_dm_users:', dbError);
    throw new Error(`Failed to query user database: ${dbError.message}`);
  }

  if (!dmUsers || dmUsers.length === 0) {
    console.error('No active DM users found in database');
    throw new Error('No active DM users found');
  }

  console.log(`Found ${dmUsers.length} active users to search through`);

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

  if (bestSimilarity >= 0.8 && bestMatch) {
    console.log('Found matching user:', {
      id: bestMatch.id,
      display_name: bestMatch.display_name,
      slack_user_id: bestMatch.slack_user_id,
      similarity: bestSimilarity
    });
    return bestMatch.slack_user_id;
  }

  throw new Error(`No matching user found for "${identifier}". Please try with their exact Slack display name or email.`);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    // Use userIdentifier instead of Username
    if (!toolArgs.userIdentifier || !toolArgs.Message) {
      throw new Error('Missing required parameters: userIdentifier and Message');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const slackAccount = await getSlackAccount(supabase);
    const userId = await findDMUser(supabase, toolArgs.userIdentifier);

    // Open DM channel and send message
    console.log('Opening DM channel with user:', userId);
    const conversationResponse = await fetch('https://slack.com/api/conversations.open', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${slackAccount.slack_bot_token}`,
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

    const messageResponse = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${slackAccount.slack_bot_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel: channelId,
        text: toolArgs.Message,
      }),
    });

    const messageResult = await messageResponse.json();
    if (!messageResult.ok) {
      console.error('Failed to send DM:', messageResult.error);
      throw new Error(`Failed to send DM: ${messageResult.error}`);
    }

    console.log('Message sent successfully:', messageResult);

    return new Response(
      JSON.stringify({
        results: [{
          toolCallId: toolCall.id,
          result: `Message sent successfully to ${toolArgs.userIdentifier}`
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