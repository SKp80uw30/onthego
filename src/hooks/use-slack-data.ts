import { useSlackAccounts } from './slack/use-slack-accounts';
import { useSlackChannels } from './slack/use-slack-channels';
import { useSlackDMUsers } from './slack/use-slack-dm-users';
export type { SlackAccount } from './slack/use-slack-accounts';
export type { SlackChannel } from './slack/use-slack-channels';
export type { SlackDMUser } from './slack/use-slack-dm-users';

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
  const {
    slackAccounts,
    isLoadingAccounts,
    hasValidSlackAccount,
    workspaceName,
    needsReauth,
    refetchSlackAccounts,
  } = useSlackAccounts();

  const {
    channels,
    isLoadingChannels,
    hasConnectedChannels,
    refetchChannels,
  } = useSlackChannels(slackAccounts?.[0]?.id);

  const {
    dmUsers,
    isLoadingDMUsers,
    refetchDMUsers,
  } = useSlackDMUsers(slackAccounts?.[0]?.id);

  const isChatActive = hasValidSlackAccount && hasConnectedChannels && !needsReauth;

  return {
    slackAccounts,
    channels,
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