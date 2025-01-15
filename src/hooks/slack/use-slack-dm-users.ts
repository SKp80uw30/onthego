import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { SlackDMUser } from '@/types/slack';

export const useSlackDMUsers = (slackAccountId?: string) => {
  const {
    data: dmUsers = [],
    isLoading: isLoadingDMUsers,
    error: dmError,
    refetch: refetchDMUsers
  } = useQuery({
    queryKey: ['slack-dm-users', slackAccountId],
    queryFn: async () => {
      if (!slackAccountId) {
        console.log('No slack account found, skipping DM users fetch');
        return [];
      }

      console.log('Fetching DM users for account:', slackAccountId);
      
      // First, trigger the edge function to update DM users
      console.log('Calling fetch-slack-dms Edge Function...');
      const { error: fetchError } = await supabase.functions.invoke('fetch-slack-dms', {
        body: { slackAccountId }
      });

      if (fetchError) {
        console.error('Error fetching DM users:', fetchError);
        throw fetchError;
      }

      // Then fetch the updated users from the database
      console.log('Fetching updated DM users from database...');
      const { data, error } = await supabase
        .from('slack_dm_users')
        .select('*')
        .eq('slack_account_id', slackAccountId)
        .eq('is_active', true)
        .order('display_name');

      if (error) {
        console.error('Error fetching DM users from database:', error);
        throw error;
      }

      console.log(`Found ${data?.length} active DM users`);
      return data as SlackDMUser[];
    },
    enabled: Boolean(slackAccountId),
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  return {
    dmUsers,
    isLoadingDMUsers,
    dmError,
    refetchDMUsers,
  };
};