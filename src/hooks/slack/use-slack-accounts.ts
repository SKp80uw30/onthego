import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { SlackAccount } from '@/types/slack';

export const useSlackAccounts = () => {
  const {
    data: slackAccounts,
    isLoading: isLoadingAccounts,
    refetch: refetchSlackAccounts,
  } = useQuery({
    queryKey: ['slack-accounts'],
    queryFn: async () => {
      console.log('Fetching Slack accounts...');
      const { data, error } = await supabase
        .from('slack_accounts')
        .select('*');

      if (error) {
        console.error('Error fetching Slack accounts:', error);
        throw error;
      }

      console.log('Slack accounts fetched:', data);
      return data as SlackAccount[];
    },
  });

  return {
    slackAccounts,
    isLoadingAccounts,
    refetchSlackAccounts,
    currentAccount: slackAccounts?.[0],
  };
};