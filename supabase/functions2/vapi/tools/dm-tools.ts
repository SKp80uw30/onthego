import { logError, logInfo } from '../../_shared/logging.ts';
import { sendDMMessage } from '../../slack/dms/send-message.ts';
import { createSupabaseClient } from '../../_shared/supabase.ts';

async function findUserByIdentifier(supabase: any, slackAccountId: string, identifier: string) {
  const { data: dmUsers, error } = await supabase
    .from('slack_dm_users')
    .select('*')
    .eq('slack_account_id', slackAccountId)
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

export async function handleDMMessage(args: {
  User_id: string;
  Message: string;
  Send_message_approval: boolean;
}): Promise<{ success: boolean; message: string }> {
  try {
    logInfo('handleDMMessage', args);

    if (!args.Send_message_approval) {
      return {
        success: false,
        message: 'Message not approved for sending',
      };
    }

    const supabase = createSupabaseClient();
    
    // Get the first slack account (assuming single account for now)
    const { data: slackAccounts, error: accountError } = await supabase
      .from('slack_accounts')
      .select('*')
      .limit(1);

    if (accountError || !slackAccounts?.length) {
      throw new Error('No Slack account found');
    }

    const user = await findUserByIdentifier(supabase, slackAccounts[0].id, args.User_id);
    await sendDMMessage(user.slack_user_id, args.Message);

    return {
      success: true,
      message: `Message sent to ${user.display_name || user.email || user.slack_user_id}`,
    };
  } catch (error) {
    logError('handleDMMessage', error);
    return {
      success: false,
      message: `Failed to send message: ${error.message}`,
    };
  }
}