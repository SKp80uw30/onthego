import { createSupabaseClient } from '../../_shared/supabase.ts';
import { SlackAccount } from './types.ts';
import { logError, logInfo } from '../../_shared/logging.ts';

export async function getSlackAccount(): Promise<SlackAccount> {
  try {
    const supabase = createSupabaseClient();
    
    logInfo('getSlackAccount', 'Fetching Slack account from database');
    
    const { data, error } = await supabase
      .from('slack_accounts')
      .select('*')
      .limit(1)
      .single();

    if (error) {
      throw error;
    }

    if (!data) {
      throw new Error('No Slack account found');
    }

    logInfo('getSlackAccount', 'Successfully retrieved Slack account', {
      hasToken: !!data.slack_bot_token,
      workspaceName: data.slack_workspace_name
    });

    return data;
  } catch (error) {
    logError('getSlackAccount', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}