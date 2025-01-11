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

export interface UseSlackDataReturn {
  slackAccounts: SlackAccount[];
  channels: SlackChannel[];
  isLoadingAccounts: boolean;
  isLoadingChannels: boolean;
  hasValidSlackAccount: boolean;
  hasConnectedChannels: boolean;
  workspaceName?: string;
  needsReauth?: boolean;
  isChatActive: boolean;
  refetchSlackAccounts: () => Promise<any>;
  refetchChannels: () => Promise<any>;
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

  const hasValidSlackAccount = !isLoadingAccounts && Boolean(slackAccounts?.length);
  const hasConnectedChannels = !isLoadingChannels && Boolean(channelsData?.channels?.length);
  const workspaceName = slackAccounts?.[0]?.slack_workspace_name;
  const needsReauth = slackAccounts?.[0]?.needs_reauth;
  const isChatActive = hasValidSlackAccount && hasConnectedChannels && !needsReauth;

  // Wrap the refetch functions to match our interface
  const refetchSlackAccounts = async () => {
    await refetchSlackAccountsOriginal();
  };

  const refetchChannels = async () => {
    await refetchChannelsOriginal();
  };

  return {
    slackAccounts,
    channels: channelsData?.channels || [],
    isLoadingAccounts,
    isLoadingChannels,
    hasValidSlackAccount,
    hasConnectedChannels,
    workspaceName,
    needsReauth,
    isChatActive,
    refetchSlackAccounts,
    refetchChannels,
  };
};