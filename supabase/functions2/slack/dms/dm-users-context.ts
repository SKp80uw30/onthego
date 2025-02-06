import { createSupabaseClient } from '../../_shared/supabase.ts';
import { logError, logInfo } from '../../_shared/logging.ts';

export interface DMUser {
  display_name: string | null;
  email: string | null;
  slack_user_id: string;
}

export async function getAvailableDMUsers(slackAccountId: string): Promise<string> {
  try {
    logInfo('getAvailableDMUsers', { slackAccountId });
    
    const supabase = createSupabaseClient();
    
    const { data: dmUsers, error } = await supabase
      .from('slack_dm_users')
      .select('display_name, email, slack_user_id')
      .eq('slack_account_id', slackAccountId)
      .eq('is_active', true);

    if (error) {
      logError('getAvailableDMUsers', error);
      throw new Error(`Failed to fetch DM users: ${error.message}`);
    }

    // Filter out users without display names or emails
    const validUsers = dmUsers.filter(user => user.display_name || user.email);

    // Create a formatted list of users for the AI context
    const usersList = validUsers.map(user => {
      const identifiers = [];
      if (user.display_name) identifiers.push(`"${user.display_name}"`);
      if (user.email) identifiers.push(`(${user.email})`);
      return identifiers.join(' ');
    }).join(', ');

    // Create the context message for VAPI
    const contextMessage = `
Available Slack DM users: ${usersList}.

When sending or fetching direct messages:
1. Only use the exact display names or email addresses listed above
2. If a user provides a name not in this list, ask them to clarify which user they mean from the available users
3. Always use the exact spelling of names as shown in the list
4. If unsure about a user's identity, ask for clarification by listing the available users`;

    logInfo('getAvailableDMUsers', { 
      userCount: validUsers.length,
      contextLength: contextMessage.length 
    });

    return contextMessage;
  } catch (error) {
    logError('getAvailableDMUsers', error);
    throw error;
  }
}

export async function validateDMUser(identifier: string, slackAccountId: string): Promise<DMUser> {
  try {
    logInfo('validateDMUser', { identifier, slackAccountId });
    
    const supabase = createSupabaseClient();
    const normalizedIdentifier = identifier.toLowerCase().trim();
    
    const { data: dmUsers, error } = await supabase
      .from('slack_dm_users')
      .select('display_name, email, slack_user_id')
      .eq('slack_account_id', slackAccountId)
      .eq('is_active', true);

    if (error) {
      logError('validateDMUser', error);
      throw new Error(`Failed to validate DM user: ${error.message}`);
    }

    const user = dmUsers.find(u => 
      (u.display_name && u.display_name.toLowerCase() === normalizedIdentifier) ||
      (u.email && u.email.toLowerCase() === normalizedIdentifier)
    );

    if (!user) {
      const availableUsers = dmUsers
        .filter(u => u.display_name || u.email)
        .map(u => `${u.display_name || ''} ${u.email ? `(${u.email})` : ''}`.trim())
        .join(', ');
        
      throw new Error(
        `No matching user found for "${identifier}". Available users are: ${availableUsers}`
      );
    }

    return user;
  } catch (error) {
    logError('validateDMUser', error);
    throw error;
  }
}