import React from 'react';
import { MessageSquare } from 'lucide-react';
import { OnboardingCard } from '@/components/OnboardingCard';
import { ConnectedChannels } from '@/components/slack/ConnectedChannels';

interface SlackChannelsCardProps {
  hasConnectedChannels: boolean;
  channels: any[];
  isLoading: boolean;
  needsReauth?: boolean;
}

export const SlackChannelsCard = ({
  hasConnectedChannels,
  channels,
  isLoading,
  needsReauth,
}: SlackChannelsCardProps) => {
  return (
    <OnboardingCard
      title="Slack Channels"
      description={needsReauth 
        ? "Please reconnect to Slack to view channels" 
        : "Manage your connected Slack channels"}
      icon={<MessageSquare className="h-5 w-5 md:h-6 md:w-6 text-primary" />}
      isCompleted={hasConnectedChannels}
      isDisabled={needsReauth}
    >
      <ConnectedChannels 
        channels={channels || []} 
        isLoading={isLoading}
        needsReauth={needsReauth}
      />
    </OnboardingCard>
  );
};