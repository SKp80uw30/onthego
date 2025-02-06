import React from 'react';
import { Slack } from 'lucide-react';
import { OnboardingCard } from '@/components/OnboardingCard';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { initiateSlackOAuth } from '@/utils/slack/slackOAuth';

interface ConnectSlackCardProps {
  isLoadingAccounts: boolean;
  hasValidSlackAccount: boolean;
  workspaceName?: string;
  needsReauth?: boolean;
}

export const ConnectSlackCard = ({
  isLoadingAccounts,
  hasValidSlackAccount,
  workspaceName,
  needsReauth,
}: ConnectSlackCardProps) => {
  const handleConnect = async () => {
    console.log('Initiating Slack connection...', { needsReauth });
    await initiateSlackOAuth(needsReauth);
  };

  const buttonText = needsReauth 
    ? "Reconnect to Slack" 
    : hasValidSlackAccount 
      ? `Connected to ${workspaceName}` 
      : "Connect to Slack";

  return (
    <OnboardingCard
      title="Connect Slack"
      description={needsReauth ? "Your Slack connection needs to be renewed to enable sending messages as yourself" : "Connect your Slack workspace to get started"}
      icon={<Slack className="h-5 w-5 md:h-6 md:w-6 text-primary" />}
      isCompleted={hasValidSlackAccount && !needsReauth}
    >
      <div className="flex justify-end">
        <Button 
          onClick={handleConnect}
          className={cn(
            "w-[250px] transition-all duration-300",
            hasValidSlackAccount && !needsReauth
              ? "bg-gray-100 hover:bg-gray-200 text-gray-600"
              : "bg-[#8B5CF6] hover:bg-[#7C3AED] text-white"
          )}
          disabled={isLoadingAccounts || (hasValidSlackAccount && !needsReauth)}
        >
          {buttonText}
        </Button>
      </div>
    </OnboardingCard>
  );
};