import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { MemberChannelsList } from './channel-lists/MemberChannelsList';
import { AvailableChannelsList } from './channel-lists/AvailableChannelsList';

interface Channel {
  name: string;
  is_member: boolean;
  is_public: boolean;
  num_members: number;
}

interface ConnectedChannelsProps {
  channels?: Channel[];
  isLoading?: boolean;
  needsReauth?: boolean;
}

export const ConnectedChannels = ({ 
  channels = [], 
  isLoading = false, 
  needsReauth = false 
}: ConnectedChannelsProps) => {
  if (needsReauth) {
    return (
      <p className="text-sm text-muted-foreground">
        Please reconnect your Slack workspace to view channels
      </p>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    );
  }

  const availableChannels = channels.filter(c => !c.is_member);
  const memberChannels = channels.filter(c => c.is_member);

  return (
    <div className="w-full mt-2">
      <div className="grid grid-cols-1 gap-3">
        <MemberChannelsList channels={memberChannels} />
        <AvailableChannelsList channels={availableChannels} />
      </div>

      <div className="mt-3">
        <h4 className="text-sm font-medium mb-1">How to Install</h4>
        <p className="text-sm text-muted-foreground">
          Type <code className="bg-secondary/50 px-1 rounded">/invite @onthego</code> in any channel to install.
        </p>
      </div>
    </div>
  );
};