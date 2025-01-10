import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSessionContext } from '@supabase/auth-helpers-react';
import { supabase } from '@/integrations/supabase/client';
import { ConnectSlackCard } from './slack/ConnectSlackCard';
import { SlackChannelsCard } from './slack/SlackChannelsCard';
import { ChatNavigationCard } from './slack/ChatNavigationCard';

export const OnboardingSection = () => {
  const { session } = useSessionContext();

  const { data: slackAccounts, isLoading: isLoadingAccounts, refetch: refetchSlackAccounts } = useQuery({
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

  const { data: channelsData, isLoading: isLoadingChannels } = useQuery({
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
      
      if (error) throw error;
      
      console.log('Channels fetched:', data);
      return data;
    },
    enabled: Boolean(slackAccounts?.[0]?.id),
  });

  const hasValidSlackAccount = !isLoadingAccounts && Boolean(slackAccounts?.length);
  const hasConnectedChannels = !isLoadingChannels && Boolean(channelsData?.channels?.length);
  const workspaceName = slackAccounts?.[0]?.slack_workspace_name;

  return (
    <div className="grid gap-4 md:gap-6 mb-8">
      <ConnectSlackCard
        isLoadingAccounts={isLoadingAccounts}
        hasValidSlackAccount={hasValidSlackAccount}
        workspaceName={workspaceName}
      />

      <SlackChannelsCard
        hasConnectedChannels={hasConnectedChannels}
        channels={channelsData?.channels || []}
        isLoading={isLoadingAccounts || isLoadingChannels}
      />

      <ChatNavigationCard
        hasValidSlackAccount={hasValidSlackAccount}
        hasConnectedChannels={hasConnectedChannels}
      />
    </div>
  );
};