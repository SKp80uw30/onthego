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

      return data as SlackAccount[];
    },
  });

  // Fetch Slack channels
  const {
    data: channels,
    isLoading: isLoadingChannels,
    refetch: refetchChannels,
  } = useQuery({
    queryKey: ['slack-channels'],
    queryFn: async () => {
      if (!slackAccounts?.[0]?.id) return [];
      
      console.log('Fetching Slack channels...');
      const { data, error } = await supabase.functions.invoke('fetch-slack-channels', {
        body: { slackAccountId: slackAccounts[0].id }
      });

      if (error) {
        console.error('Error fetching Slack channels:', error);
        throw error;
      }

      return data.channels as SlackChannel[];
    },
    enabled: !!slackAccounts?.[0]?.id,
  });

  // Fetch DM users with explicit Edge Function call
  const {
    data: dmUsers,
    isLoading: isLoadingDMUsers,
    refetch: refetchDMUsers,
  } = useQuery({
    queryKey: ['slack-dm-users'],
    queryFn: async () => {
      if (!slackAccounts?.[0]?.id) return [];

      console.log('Fetching Slack DM users...');
      
      // First call the Edge Function to update DM users
      const { error: fetchError } = await supabase.functions.invoke('fetch-slack-dms', {
        body: { slackAccountId: slackAccounts[0].id }
      });

      if (fetchError) {
        console.error('Error updating DM users:', fetchError);
        throw fetchError;
      }

      // Then fetch the updated users from the database
      const { data, error } = await supabase
        .from('slack_dm_users')
        .select('*')
        .eq('slack_account_id', slackAccounts[0].id)
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching DM users from database:', error);
        throw error;
      }

      console.log(`Found ${data?.length} active DM users`);
      return data as SlackDMUser[];
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
    refetchDMUsers,
  };
};