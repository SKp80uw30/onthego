import { createSupabaseClient } from '../../_shared/supabase.ts';
import { logError, logInfo } from '../../_shared/logging.ts';

export async function getSlackAccount(slackAccountId?: string) {
  const supabase = createSupabaseClient();
  
  try {
    const query = supabase
      .from('slack_accounts')
      .select('*');
    
    if (slackAccountId) {
      query.eq('id', slackAccountId);
    }
    
    const { data: slackAccount, error } = await query.limit(1).single();

    if (error || !slackAccount?.slack_bot_token) {
      logError('getSlackAccount', error || 'No slack account found');
      throw new Error('Failed to get Slack account details');
    }

    logInfo('getSlackAccount', {
      accountId: slackAccount.id,
      workspaceName: slackAccount.slack_workspace_name
    });

    return slackAccount;
  } catch (error) {
    logError('getSlackAccount', error);
    throw error;
  }
}