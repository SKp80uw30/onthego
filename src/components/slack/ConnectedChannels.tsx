import React from 'react';
import { MessageSquare, Lock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';

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

export const ConnectedChannels = ({ channels = [], isLoading = false, needsReauth = false }: ConnectedChannelsProps) => {
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

  const getDisplayName = (channel: Channel) => {
    if (!channel.is_public) {
      return channel.name.replace('private-', '');
    }
    return `#${channel.name}`;
  };

  const availableChannels = channels.filter(c => !c.is_member);
  const memberChannels = channels.filter(c => c.is_member);

  return (
    <div className="w-full mt-2">
      <div className="grid grid-cols-1 gap-3">
        <div>
          <h4 className="text-sm font-medium mb-2">Member Channels</h4>
          {memberChannels.length > 0 ? (
            <div className="bg-white/50 rounded-lg p-2">
              <ScrollArea className="h-[180px]">
                <ul className="space-y-1">
                  {memberChannels.map((channel) => (
                    <li key={channel.name} className="text-sm truncate px-2 py-1">
                      {getDisplayName(channel)}
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No channels connected yet</p>
          )}
        </div>

        <div>
          <h4 className="text-sm font-medium mb-2">Available Channels</h4>
          {availableChannels.length > 0 ? (
            <div className="bg-white/50 rounded-lg p-2">
              <ScrollArea className="h-[180px]">
                <ul className="space-y-1">
                  {availableChannels.map((channel) => (
                    <li key={channel.name} className="text-sm truncate px-2 py-1">
                      {getDisplayName(channel)}
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No additional channels available</p>
          )}
        </div>
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