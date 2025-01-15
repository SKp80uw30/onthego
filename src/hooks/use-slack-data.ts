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
    queryKey: ['slack-channels'],
    queryFn: async () => {
      if (!slackAccounts?.[0]?.id) {
        console.log('No slack account found, skipping channel fetch');
        return [];
      }
      
      console.log('Fetching Slack channels for account:', slackAccounts[0].id);
      const { data, error } = await supabase.functions.invoke('fetch-slack-channels', {
        body: { slackAccountId: slackAccounts[0].id }
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

  // Fetch DM users
  const {
    data: dmUsers,
    isLoading: isLoadingDMUsers,
  } = useQuery({
    queryKey: ['slack-dm-users'],
    queryFn: async () => {
      if (!slackAccounts?.[0]?.id) {
        console.log('No slack account found, skipping DM users fetch');
        return [];
      }

      console.log('Fetching Slack DM users for account:', slackAccounts[0].id);
      const { data, error } = await supabase
        .from('slack_dm_users')
        .select('*')
        .eq('slack_account_id', slackAccounts[0].id)
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching Slack DM users:', error);
        throw error;
      }

      console.log('DM users fetched:', data?.length);
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
      }
    }, 30000); // Refetch every 30 seconds

    return () => clearInterval(interval);
  }, [slackAccounts, refetchSlackAccounts, refetchChannels]);

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