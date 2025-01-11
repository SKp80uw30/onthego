import React from 'react';
import { MessageSquare } from 'lucide-react';
import { OnboardingCard } from '@/components/OnboardingCard';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface ChatNavigationCardProps {
  hasValidSlackAccount: boolean;
  hasConnectedChannels: boolean;
  needsReauth?: boolean;
}

export const ChatNavigationCard = ({
  hasValidSlackAccount,
  hasConnectedChannels,
  needsReauth,
}: ChatNavigationCardProps) => {
  const isDisabled = !hasValidSlackAccount || !hasConnectedChannels || needsReauth;
  
  return (
    <OnboardingCard
      title="Go to Chat"
      description={needsReauth 
        ? "Please reconnect to Slack first" 
        : "Start chatting with your Slack channels"}
      icon={<MessageSquare className="h-5 w-5 md:h-6 md:w-6 text-primary" />}
      isDisabled={isDisabled}
      className={cn(
        'transition-all duration-300',
        !isDisabled && 'border-primary/30 shadow-lg shadow-primary/10'
      )}
    >
      <Link to="/chat" className="block w-[250px]">
        <Button 
          className={cn(
            "w-full transition-all duration-300",
            !isDisabled ? [
              "bg-[#8B5CF6] hover:bg-[#7C3AED]",
              "text-white shadow-md",
              "hover:shadow-lg hover:scale-[1.02]",
              "active:scale-[0.98]"
            ] : [
              "bg-gray-100 text-gray-400",
              "cursor-not-allowed"
            ]
          )}
          disabled={isDisabled}
        >
          Go to Chat
        </Button>
      </Link>
    </OnboardingCard>
  );
};