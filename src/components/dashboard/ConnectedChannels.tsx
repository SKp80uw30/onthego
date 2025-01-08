import React from 'react';
import { MessageSquare, ArrowRight } from 'lucide-react';
import { OnboardingCard } from '@/components/OnboardingCard';

interface ConnectedChannelsProps {
  channels: string[];
}

export const ConnectedChannels = ({ channels }: ConnectedChannelsProps) => {
  return (
    <OnboardingCard
      title="Connected Channels"
      description="Manage your Slack channel connections"
      icon={<MessageSquare className="h-5 w-5 md:h-6 md:w-6 text-primary" />}
    >
      <div className="mt-4 flex gap-6">
        <div className="flex-1">
          <h4 className="text-sm font-medium mb-2">Connected Channels</h4>
          {channels.length > 0 ? (
            <ul className="space-y-1">
              {channels.map((channel) => (
                <li key={channel} className="text-sm text-muted-foreground flex items-center">
                  <ArrowRight className="h-4 w-4 mr-1" />
                  {channel}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No channels connected yet</p>
          )}
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-medium mb-2">How to Connect</h4>
          <p className="text-sm text-muted-foreground">
            Type <code className="bg-secondary px-1 rounded">/on-the-go</code> in any Slack channel 
            you want to connect to On-The-Go.
          </p>
        </div>
      </div>
    </OnboardingCard>
  );
};