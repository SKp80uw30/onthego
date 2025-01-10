import React from 'react';
import { MessageSquare } from 'lucide-react';

interface ConnectedChannelsProps {
  channels?: string[];
}

export const ConnectedChannels = ({ channels = [] }: ConnectedChannelsProps) => {
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