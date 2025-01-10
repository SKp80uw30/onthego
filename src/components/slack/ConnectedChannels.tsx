import React from 'react';
import { MessageSquare } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface ConnectedChannelsProps {
  channels?: string[];
  isLoading?: boolean;
}

export const ConnectedChannels = ({ channels = [], isLoading = false }: ConnectedChannelsProps) => {
  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row gap-4 md:gap-6 w-full">
      <div className="flex-1">
        <h4 className="text-sm font-medium text-muted-foreground mb-2">Connected Channels</h4>
        {channels.length > 0 ? (
          <ul className="space-y-2">
            {channels.map((channel) => (
              <li key={channel} className="flex items-center gap-2 text-sm">
                <MessageSquare className="h-4 w-4 text-primary" />
                <span>{channel}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No channels connected yet</p>
        )}
      </div>
      <div className="flex-1">
        <h4 className="text-sm font-medium text-muted-foreground mb-2">How to Install</h4>
        <p className="text-sm text-muted-foreground">
          Onthego must be invited to each channel you wish to use it in. Type <span className="font-mono bg-secondary/50 px-1 rounded">/invite @onthego</span> to install.
        </p>
      </div>
    </div>
  );
};