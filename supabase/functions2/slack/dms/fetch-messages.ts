import { corsHeaders } from '../../_shared/cors.ts';
import { logError, logInfo } from '../../_shared/logging.ts';
import { getSlackAccount } from '../common/auth.ts';
import { callSlackApi } from '../common/api.ts';
import { createSupabaseClient } from '../../_shared/supabase.ts';
import type { SlackMessage } from '../common/types.ts';

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

export async function fetchDMMessages(
  userIdentifier: string,
  messageCount: number = 5
): Promise<SlackMessage[]> {
  try {
    const user = await findUserByIdentifier(userIdentifier);
    const slackAccount = await getSlackAccount();
    const channel = await openDMChannel(slackAccount.slack_bot_token, user.slack_user_id);

    logInfo('fetchDMMessages', {
      userIdentifier,
      userId: user.slack_user_id,
      messageCount,
    });

    const response = await callSlackApi(
      'conversations.history',
      slackAccount.slack_bot_token,
      'GET',
      {
        channel: channel.id,
        limit: messageCount,
      }
    );

    return response.messages;
  } catch (error) {
    logError('fetchDMMessages', error);
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
    const { userIdentifier, messageCount } = await req.json();
    const messages = await fetchDMMessages(userIdentifier, messageCount);
    
    return new Response(
      JSON.stringify({ messages }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});