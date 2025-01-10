import React from 'react';
import { MessageSquare } from 'lucide-react';
import { OnboardingCard } from '@/components/OnboardingCard';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

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
  return (
    <OnboardingCard
      title="Go to Chat"
      description={needsReauth 
        ? "Please reconnect to Slack first" 
        : "Start chatting with your Slack channels"}
      icon={<MessageSquare className="h-5 w-5 md:h-6 md:w-6 text-primary" />}
      isDisabled={!hasValidSlackAccount || !hasConnectedChannels || needsReauth}
    >
      <Link to="/chat" className="block">
        <Button 
          className="w-full bg-[#8B5CF6] hover:bg-[#7C3AED] text-white disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!hasValidSlackAccount || !hasConnectedChannels || needsReauth}
        >
          Go to Chat
        </Button>
      </Link>
    </OnboardingCard>
  );
};