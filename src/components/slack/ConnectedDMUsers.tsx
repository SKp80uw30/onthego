import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { User } from 'lucide-react';
import type { SlackDMUser } from '@/types/slack';

interface ConnectedDMUsersProps {
  dmUsers: SlackDMUser[];
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

  return (
    <div className="w-full mt-4">
      <div className="grid grid-cols-1 gap-4">
        <div>
          <h4 className="text-sm font-medium mb-2">Available DM Users</h4>
          {activeUsers.length > 0 ? (
            <div className="bg-white/50 rounded-lg p-2">
              <ScrollArea className="h-[180px]">
                <div className="space-y-1">
                  {activeUsers.map((user, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 text-sm px-2 py-1.5 rounded-md hover:bg-secondary/50 transition-colors"
                    >
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate">
                        {user.display_name || user.email || 'Unknown User'}
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No active DM users available</p>
          )}
        </div>
      </div>

      <div className="mt-3">
        <h4 className="text-sm font-medium mb-1">Direct Messaging</h4>
        <p className="text-sm text-muted-foreground">
          Use voice commands to send direct messages to Slack users
        </p>
      </div>
    </div>
  );
};