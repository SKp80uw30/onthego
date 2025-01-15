import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { SlackAccount, SlackChannel, SlackDMUser } from '@/types/slack';

export const useSlackData = () => {
  // Fetch Slack accounts
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

  // Fetch Slack channels
  const {
    data: channels,
    isLoading: isLoadingChannels,
    refetch: refetchChannels,
  } = useQuery({
    queryKey: ['slack-channels', slackAccounts?.[0]?.id],
    queryFn: async () => {
      const slackAccountId = slackAccounts?.[0]?.id;
      if (!slackAccountId) {
        console.log('No slack account found, skipping channel fetch');
        return [];
      }
      
      console.log('Fetching Slack channels for account:', slackAccountId);
      const { data, error } = await supabase.functions.invoke('fetch-slack-channels', {
        body: { slackAccountId }
      });

      if (error) {
        console.error('Error fetching Slack channels:', error);
        throw error;
      }

      console.log('Channels fetched:', data?.channels?.length);
      return data.channels as SlackChannel[];
    },
    enabled: !!slackAccounts?.[0]?.id,
  });

  // Fetch DM users with proper dependency handling
  const {
    data: dmUsers = [],
    isLoading: isLoadingDMUsers,
    refetch: refetchDMUsers,
  } = useQuery({
    queryKey: ['slack-dm-users', slackAccounts?.[0]?.id],
    queryFn: async () => {
      const slackAccountId = slackAccounts?.[0]?.id;
      if (!slackAccountId) {
        console.log('No slack account found, skipping DM users fetch');
        return [];
      }

      try {
        console.log('Starting DM users fetch process for account:', slackAccountId);
        
        // First trigger the edge function to update DM users
        const { data: functionData, error: functionError } = await supabase.functions.invoke('fetch-slack-dms', {
          body: { slackAccountId }
        });

        if (functionError) {
          console.error('Error in fetch-slack-dms function:', functionError);
          throw functionError;
        }

        console.log('Edge function completed successfully:', functionData);

        // Add a small delay to ensure the database has been updated
        await new Promise(resolve => setTimeout(resolve, 1000));

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

        console.log(`Found ${data?.length} active DM users in database`);
        return data as SlackDMUser[];
      } catch (error) {
        console.error('Error in DM users fetch process:', error);
        throw error;
      }
    },
    enabled: !!slackAccounts?.[0]?.id,
  });

  // Set up periodic refetching
  useEffect(() => {
    const interval = setInterval(() => {
      if (slackAccounts?.[0]?.id) {
        console.log('Refetching Slack data...');
        refetchSlackAccounts();
        refetchChannels();
        refetchDMUsers();
      }
    }, 30000); // Refetch every 30 seconds

    return () => clearInterval(interval);
  }, [slackAccounts, refetchSlackAccounts, refetchChannels, refetchDMUsers]);

  const currentAccount = slackAccounts?.[0];
  
  return {
    isLoadingAccounts,
    isLoadingChannels,
    isLoadingDMUsers,
    hasValidSlackAccount: !!currentAccount,
    hasConnectedChannels: (channels?.length ?? 0) > 0,
    workspaceName: currentAccount?.slack_workspace_name,
    needsReauth: currentAccount?.needs_reauth ?? false,
    isChatActive: false, // This will be managed by the chat state
    channels: channels ?? [],
    dmUsers: dmUsers ?? [],
    refetchSlackAccounts,
    refetchChannels,
  };
};