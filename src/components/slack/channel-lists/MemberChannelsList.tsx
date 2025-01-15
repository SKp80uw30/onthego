import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Channel {
  name: string;
  is_public: boolean;
}

interface MemberChannelsListProps {
  channels: Channel[];
}

export const MemberChannelsList = ({ channels }: MemberChannelsListProps) => {
  const getDisplayName = (channel: Channel) => {
    if (!channel.is_public) {
      return channel.name.replace('private-', '');
    }
    return `#${channel.name}`;
  };

  return (
    <div>
      <h4 className="text-sm font-medium mb-2">Member Channels</h4>
      {channels.length > 0 ? (
        <div className="bg-white/50 rounded-lg p-2">
          <ScrollArea className="h-[180px]">
            <ul className="space-y-1">
              {channels.map((channel) => (
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
  );
};