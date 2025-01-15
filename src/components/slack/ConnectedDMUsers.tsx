import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { User, MessageCircle } from 'lucide-react';

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

  const activeUsers = dmUsers.filter(user => user.display_name || user.email);
  const availableUsers = dmUsers.filter(user => !(user.display_name || user.email));

  return (
    <div className="w-full mt-4">
      <div className="grid grid-cols-1 gap-6">
        <div>
          <h4 className="text-sm font-medium mb-3">DM Channels</h4>
          {activeUsers.length > 0 ? (
            <div className="bg-white/50 rounded-lg p-4">
              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {activeUsers.map((user, index) => (
                    <div
                      key={index}
                      className="flex items-center space-x-2 rounded-lg border border-border/50 bg-background/50 p-2"
                    >
                      <MessageCircle className="h-4 w-4 text-primary" />
                      <span className="text-sm">
                        {user.display_name || user.email || 'Unknown User'}
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No active DM channels yet</p>
          )}
        </div>

        <div>
          <h4 className="text-sm font-medium mb-3">DM Channels Available</h4>
          {availableUsers.length > 0 ? (
            <div className="bg-white/50 rounded-lg p-4">
              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {availableUsers.map((user, index) => (
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
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No additional DM channels available
            </p>
          )}
        </div>
      </div>
    </div>
  );
};