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
      title={
        <div className="flex flex-col items-start gap-1">
          <MessageSquare className="h-5 w-5 md:h-6 md:w-6 text-primary" />
          <span>Slack Channels</span>
        </div>
      }
      description={needsReauth 
        ? "Please reconnect to Slack to view channels" 
        : "Manage your connected Slack channels"}
      isCompleted={hasConnectedChannels}
      isDisabled={needsReauth}
      content={
        <ConnectedChannels 
          channels={channels || []} 
          isLoading={isLoading}
          needsReauth={needsReauth}
        />
      }
    />
  );
};