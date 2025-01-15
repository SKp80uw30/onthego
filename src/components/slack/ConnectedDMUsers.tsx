import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { User } from 'lucide-react';

interface ConnectedDMUsersProps {
  dmUsers: Array<{
    display_name?: string | null;
    email?: string | null;
  }>;
  isLoading: boolean;
  needsReauth?: boolean;
}

export const ConnectedDMUsers = ({
  dmUsers,
  isLoading,
  needsReauth,
}: ConnectedDMUsersProps) => {
  if (needsReauth) {
    return (
      <div className="text-sm text-muted-foreground">
        Please reconnect to Slack to view DM users
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  if (!dmUsers?.length) {
    return (
      <div className="text-sm text-muted-foreground">
        No DM users connected yet. Users will appear here when you interact with them through onthego.
      </div>
    );
  }

  return (
    <ScrollArea className="h-[120px] rounded-md border p-2">
      <div className="space-y-2">
        {dmUsers.map((user, index) => (
          <div
            key={index}
            className="flex items-center space-x-2 rounded-lg border border-border/50 bg-background/50 p-2"
          >
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              {user.display_name || user.email || 'Unknown User'}
            </span>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};