import React from 'react';
import { useSlackData } from '@/hooks/use-slack-data';
import { OnboardingCards } from './slack/OnboardingCards';

export const OnboardingSection = () => {
  const {
    isLoadingAccounts,
    isLoadingChannels,
    isLoadingDMUsers,
    hasValidSlackAccount,
    hasConnectedChannels,
    workspaceName,
    needsReauth,
    isChatActive,
    channels,
    dmUsers,
    refetchSlackAccounts,
    refetchChannels,
  } = useSlackData();

  // Add refetch on focus
  React.useEffect(() => {
    const refetchData = async () => {
      if (hasValidSlackAccount) {
        console.log('Refetching data on window focus');
        await Promise.all([refetchSlackAccounts(), refetchChannels()]);
      }
    };

    window.addEventListener('focus', refetchData);
    return () => window.removeEventListener('focus', refetchData);
  }, [hasValidSlackAccount, refetchSlackAccounts, refetchChannels]);

  return (
    <div className="grid gap-4 md:gap-6 mb-8">
      <OnboardingCards
        isLoadingAccounts={isLoadingAccounts}
        isLoadingChannels={isLoadingChannels}
        isLoadingDMUsers={isLoadingDMUsers}
        hasValidSlackAccount={hasValidSlackAccount}
        hasConnectedChannels={hasConnectedChannels}
        workspaceName={workspaceName}
        needsReauth={needsReauth}
        isChatActive={isChatActive}
        channels={channels}
        dmUsers={dmUsers}
      />
    </div>
  );
};