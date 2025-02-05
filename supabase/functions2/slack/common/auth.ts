import { createSupabaseClient } from '../../_shared/supabase.ts';
import { SlackAccount } from './types.ts';
import { logError } from '../../_shared/logging.ts';

export async function getSlackAccount(): Promise<SlackAccount> {
  try {
    const supabase = createSupabaseClient();
    
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

    return data;
  } catch (error) {
    logError('getSlackAccount', error);
    throw error;
  }
}