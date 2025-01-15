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

      console.log('Starting DM users fetch for account:', slackAccountId);
      
      try {
        // First, trigger the edge function to update DM users
        console.log('Calling fetch-slack-dms Edge Function...');
        const { data: functionData, error: functionError } = await supabase.functions.invoke('fetch-slack-dms', {
          body: { slackAccountId }
        });

        if (functionError) {
          console.error('Error in fetch-slack-dms function:', functionError);
          throw functionError;
        }

        console.log('Edge function response:', functionData);

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
      } catch (error) {
        console.error('Error in useSlackDMUsers:', error);
        throw error;
      }
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