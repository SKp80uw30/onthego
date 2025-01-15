import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SlackDMUser {
  display_name?: string | null;
  email?: string | null;
}

export const useSlackDMUsers = (slackAccountId?: string) => {
  const {
    data: dmUsers = [],
    isLoading: isLoadingDMUsers,
    refetch: refetchDMUsers
  } = useQuery({
    queryKey: ['slack-dm-users', slackAccountId],
    queryFn: async () => {
      if (!slackAccountId) {
        console.log('No slack account found, skipping DM users fetch');
        return [];
      }

      console.log('Fetching DM users for account:', slackAccountId);
      const { data, error } = await supabase
        .from('slack_dm_users')
        .select('display_name, email')
        .eq('slack_account_id', slackAccountId)
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching DM users:', error);
        throw error;
      }

      console.log('DM users fetched:', data);
      return data || [];
    },
    enabled: Boolean(slackAccountId),
    refetchInterval: 30000,
  });

  return {
    dmUsers,
    isLoadingDMUsers,
    refetchDMUsers,
  };
};