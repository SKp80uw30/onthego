import React from 'react';
import { MessageSquare, Lock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

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

  const getChannelIcon = (channel: Channel) => {
    if (!channel.is_public) {
      return <Lock className="h-4 w-4 text-primary" />;
    }
    return <MessageSquare className="h-4 w-4 text-primary" />;
  };

  const getDisplayName = (channel: Channel) => {
    if (!channel.is_public) {
      return channel.name.replace('private-', '');
    }
    return `#${channel.name}`;
  };

  const availableChannels = channels.filter(c => !c.is_member);
  const memberChannels = channels.filter(c => c.is_member);

  return (
    <div className="space-y-4">
      {channels.length > 0 && memberChannels.length === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            The bot hasn't been invited to any channels yet. Use <code className="bg-secondary/50 px-1 rounded">/invite @onthego</code> in the channels where you want to use it.
          </AlertDescription>
        </Alert>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Member Channels</h4>
          {memberChannels.length > 0 ? (
            <ScrollArea className="h-[200px] w-full rounded-md border p-4">
              <ul className="space-y-2">
                {memberChannels.map((channel) => (
                  <li key={channel.name} className="flex items-center gap-2 text-sm">
                    {getChannelIcon(channel)}
                    <span>{getDisplayName(channel)}</span>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          ) : (
            <p className="text-sm text-muted-foreground">No channels connected yet</p>
          )}
        </div>

        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Available Channels</h4>
          {availableChannels.length > 0 ? (
            <ScrollArea className="h-[200px] w-full rounded-md border p-4">
              <ul className="space-y-2">
                {availableChannels.map((channel) => (
                  <li key={channel.name} className="flex items-center gap-2 text-sm">
                    {getChannelIcon(channel)}
                    <span>{getDisplayName(channel)}</span>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          ) : (
            <p className="text-sm text-muted-foreground">No additional channels available</p>
          )}
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium text-muted-foreground mb-2">How to Install</h4>
        <p className="text-sm text-muted-foreground">
          Onthego must be invited to each channel you wish to use it in. Type <code className="bg-secondary/50 px-1 rounded">/invite @onthego</code> in any channel to install.
        </p>
      </div>
    </div>
  );
};