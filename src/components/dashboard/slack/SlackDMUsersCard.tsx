import React from 'react';
import { MessageSquare } from 'lucide-react';
import { OnboardingCard } from '@/components/OnboardingCard';
import { ConnectedDMUsers } from '@/components/slack/ConnectedDMUsers';
import type { SlackDMUser } from '@/types/slack';

interface SlackDMUsersCardProps {
  dmUsers: SlackDMUser[];
  isLoading: boolean;
  needsReauth?: boolean;
}

export const SlackDMUsersCard = ({
  dmUsers,
  isLoading,
  needsReauth,
}: SlackDMUsersCardProps) => {
  return (
    <OnboardingCard
      title={
        <div className="flex flex-col items-start gap-1">
          <MessageSquare className="h-5 w-5 md:h-6 md:w-6 text-primary" />
          <span>Direct Messages</span>
        </div>
      }
      description={needsReauth 
        ? "Please reconnect to Slack to view DM users" 
        : "View and interact with your Slack direct message contacts"}
      isDisabled={needsReauth}
      content={
        <ConnectedDMUsers 
          dmUsers={dmUsers} 
          isLoading={isLoading}
          needsReauth={needsReauth}
        />
      }
    />
  );
};