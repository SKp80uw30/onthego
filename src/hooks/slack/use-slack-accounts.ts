import { useQuery } from '@tanstack/react-query';
import { useSessionContext } from '@supabase/auth-helpers-react';
import { supabase } from '@/integrations/supabase/client';

export interface SlackAccount {
  id: string;
  slack_workspace_name?: string;
  needs_reauth?: boolean;
}

export const useSlackAccounts = () => {
  const { session } = useSessionContext();

  const { 
    data: slackAccounts = [], 
    isLoading: isLoadingAccounts, 
    refetch: refetchSlackAccounts 
  } = useQuery({
    queryKey: ['slack-accounts', session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) {
        console.log('No active session, skipping fetch');
        return [];
      }
      
      console.log('Fetching slack accounts...');
      const { data, error } = await supabase
        .from('slack_accounts')
        .select('*')
        .eq('user_id', session.user.id);
      
      if (error) {
        console.error('Error fetching slack accounts:', error);
        throw error;
      }
      
      console.log('Slack accounts fetched:', data);
      return data || [];
    },
    enabled: !!session?.user?.id,
  });

  const hasValidSlackAccount = !isLoadingAccounts && Boolean(slackAccounts?.length);
  const workspaceName = slackAccounts?.[0]?.slack_workspace_name;
  const needsReauth = slackAccounts?.[0]?.needs_reauth;

  return {
    slackAccounts,
    isLoadingAccounts,
    hasValidSlackAccount,
    workspaceName,
    needsReauth,
    refetchSlackAccounts,
  };
};