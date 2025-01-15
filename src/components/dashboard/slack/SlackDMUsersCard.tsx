import React from 'react';
import { User } from 'lucide-react';
import { OnboardingCard } from '@/components/OnboardingCard';
import { ConnectedDMUsers } from '@/components/slack/ConnectedDMUsers';
import type { SlackDMUser } from '@/hooks/use-slack-data';

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
      title="Direct Messages"
      description={needsReauth 
        ? "Please reconnect to Slack to view DM users" 
        : "Users you can message directly through onthego"}
      icon={<User className="h-5 w-5 md:h-6 md:w-6 text-primary" />}
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