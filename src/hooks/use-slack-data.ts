import { useEffect } from 'react';
import { useSlackAccounts } from './slack/use-slack-accounts';
import { useSlackChannels } from './slack/use-slack-channels';
import { useSlackDMUsers } from './slack/use-slack-dm-users';

export const useSlackData = () => {
  const {
    slackAccounts,
    isLoadingAccounts,
    refetchSlackAccounts,
    currentAccount,
  } = useSlackAccounts();

  const {
    channels,
    isLoadingChannels,
    refetchChannels,
    hasConnectedChannels,
  } = useSlackChannels(currentAccount?.id);

  const {
    dmUsers,
    isLoadingDMUsers,
    refetchDMUsers,
  } = useSlackDMUsers(currentAccount?.id);

  // Set up periodic refetching
  useEffect(() => {
    const interval = setInterval(() => {
      if (currentAccount?.id) {
        console.log('Refetching Slack data...');
        refetchSlackAccounts();
        refetchChannels();
        refetchDMUsers();
      }
    }, 30000); // Refetch every 30 seconds

    return () => clearInterval(interval);
  }, [currentAccount?.id, refetchSlackAccounts, refetchChannels, refetchDMUsers]);

  return {
    isLoadingAccounts,
    isLoadingChannels,
    isLoadingDMUsers,
    hasValidSlackAccount: !!currentAccount,
    hasConnectedChannels,
    workspaceName: currentAccount?.slack_workspace_name,
    needsReauth: currentAccount?.needs_reauth ?? false,
    isChatActive: false,
    channels: channels ?? [],
    dmUsers: dmUsers ?? [],
    refetchSlackAccounts,
    refetchChannels,
  };
};