import { corsHeaders } from '../../_shared/cors.ts';
import { logError, logInfo } from '../../_shared/logging.ts';
import { getSlackAccount } from '../common/auth.ts';
import { callSlackApi } from '../common/api.ts';
import { createSupabaseClient } from '../../_shared/supabase.ts';

async function findUserByIdentifier(identifier: string) {
  const supabase = createSupabaseClient();
  const { data: slackAccounts } = await supabase
    .from('slack_accounts')
    .select('*')
    .limit(1);

  if (!slackAccounts?.length) {
    throw new Error('No Slack account found');
  }

  const { data: dmUsers, error } = await supabase
    .from('slack_dm_users')
    .select('*')
    .eq('slack_account_id', slackAccounts[0].id)
    .eq('is_active', true);

  if (error) {
    throw new Error(`Failed to query DM users: ${error.message}`);
  }

  const normalizedIdentifier = identifier.toLowerCase().trim();
  const user = dmUsers.find(u => 
    (u.display_name && u.display_name.toLowerCase() === normalizedIdentifier) ||
    (u.email && u.email.toLowerCase() === normalizedIdentifier) ||
    (u.slack_user_id === normalizedIdentifier)
  );

  if (!user) {
    throw new Error(`No matching user found for "${identifier}". Try using their exact Slack display name or email.`);
  }

  return user;
}

export async function sendDMMessage(userIdentifier: string, message: string): Promise<void> {
  try {
    const user = await findUserByIdentifier(userIdentifier);
    const slackAccount = await getSlackAccount();
    const channel = await openDMChannel(slackAccount.slack_bot_token, user.slack_user_id);

    logInfo('sendDMMessage', 'Sending DM', {
      userIdentifier,
      userId: user.slack_user_id,
      messageLength: message.length,
      channelId: channel.id
    });

    await callSlackApi(
      'chat.postMessage',
      slackAccount.slack_bot_token,
      'POST',
      {
        channel: channel.id,
        text: message,
      }
    );
  } catch (error) {
    logError('sendDMMessage', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

async function openDMChannel(token: string, userId: string) {
  const response = await callSlackApi(
    'conversations.open',
    token,
    'POST',
    {
      users: userId,
    }
  );

  return response.channel;
}

// Handle incoming requests
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userIdentifier, message } = await req.json();
    
    logInfo('send-slack-dm', 'Processing request', {
      userIdentifier,
      messageLength: message?.length
    });

    if (!userIdentifier || !message) {
      throw new Error('Missing required parameters: userIdentifier and message are required');
    }

    await sendDMMessage(userIdentifier, message);
    
    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    logError('send-slack-dm', error instanceof Error ? error : new Error(String(error)));
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : String(error),
        success: false 
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});