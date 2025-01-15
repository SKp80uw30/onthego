import { useQuery } from '@tanstack/react-query';
import { useSessionContext } from '@supabase/auth-helpers-react';
import { supabase } from '@/integrations/supabase/client';

export interface SlackAccount {
  id: string;
  slack_workspace_name?: string;
  needs_reauth?: boolean;
}

export interface SlackChannel {
  id: string;
  name: string;
}

export interface SlackDMUser {
  display_name?: string | null;
  email?: string | null;
}

export interface UseSlackDataReturn {
  slackAccounts: SlackAccount[];
  channels: SlackChannel[];
  dmUsers: SlackDMUser[];
  isLoadingAccounts: boolean;
  isLoadingChannels: boolean;
  isLoadingDMUsers: boolean;
  hasValidSlackAccount: boolean;
  hasConnectedChannels: boolean;
  workspaceName?: string;
  needsReauth?: boolean;
  isChatActive: boolean;
  refetchSlackAccounts: () => Promise<any>;
  refetchChannels: () => Promise<any>;
  refetchDMUsers: () => Promise<any>;
}

export const useSlackData = (): UseSlackDataReturn => {
  const { session } = useSessionContext();

  const { 
    data: slackAccounts = [], 
    isLoading: isLoadingAccounts, 
    refetch: refetchSlackAccountsOriginal 
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

  const { 
    data: channelsData, 
    isLoading: isLoadingChannels, 
    refetch: refetchChannelsOriginal 
  } = useQuery({
    queryKey: ['slack-channels', slackAccounts?.[0]?.id],
    queryFn: async () => {
      if (!slackAccounts?.[0]?.id) {
        console.log('No slack account found, skipping channel fetch');
        return { channels: [] };
      }
      
      console.log('Fetching channels for account:', slackAccounts[0].id);
      const { data, error } = await supabase.functions.invoke('fetch-slack-channels', {
        body: { slackAccountId: slackAccounts[0].id }
      });
      
      if (error) {
        console.error('Error fetching channels:', error);
        throw error;
      }
      
      console.log('Channels fetched:', data);
      return data;
    },
    enabled: Boolean(slackAccounts?.[0]?.id),
    refetchInterval: 30000,
  });

  const {
    data: dmUsers = [],
    isLoading: isLoadingDMUsers,
    refetch: refetchDMUsersOriginal
  } = useQuery({
    queryKey: ['slack-dm-users', slackAccounts?.[0]?.id],
    queryFn: async () => {
      if (!slackAccounts?.[0]?.id) {
        console.log('No slack account found, skipping DM users fetch');
        return [];
      }

      console.log('Fetching DM users for account:', slackAccounts[0].id);
      const { data, error } = await supabase
        .from('slack_dm_users')
        .select('display_name, email')
        .eq('slack_account_id', slackAccounts[0].id)
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching DM users:', error);
        throw error;
      }

      console.log('DM users fetched:', data);
      return data || [];
    },
    enabled: Boolean(slackAccounts?.[0]?.id),
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const hasValidSlackAccount = !isLoadingAccounts && Boolean(slackAccounts?.length);
  const hasConnectedChannels = !isLoadingChannels && Boolean(channelsData?.channels?.length);
  const workspaceName = slackAccounts?.[0]?.slack_workspace_name;
  const needsReauth = slackAccounts?.[0]?.needs_reauth;
  const isChatActive = hasValidSlackAccount && hasConnectedChannels && !needsReauth;

  const refetchSlackAccounts = async () => {
    await refetchSlackAccountsOriginal();
  };

  const refetchChannels = async () => {
    await refetchChannelsOriginal();
  };

  const refetchDMUsers = async () => {
    await refetchDMUsersOriginal();
  };

  return {
    slackAccounts,
    channels: channelsData?.channels || [],
    dmUsers,
    isLoadingAccounts,
    isLoadingChannels,
    isLoadingDMUsers,
    hasValidSlackAccount,
    hasConnectedChannels,
    workspaceName,
    needsReauth,
    isChatActive,
    refetchSlackAccounts,
    refetchChannels,
    refetchDMUsers,
  };
};
