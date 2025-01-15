import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { User, Mail } from 'lucide-react';
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
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <User className="h-4 w-4" />
        <span>Please reconnect to Slack to view DM users</span>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
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
          <h4 className="text-sm font-medium mb-3">Available DM Users ({activeUsers.length})</h4>
          {activeUsers.length > 0 ? (
            <div className="bg-background/50 rounded-lg p-2 border">
              <ScrollArea className="h-[180px]">
                <div className="space-y-1">
                  {activeUsers.map((user, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 text-sm px-3 py-2 rounded-md hover:bg-secondary/50 transition-colors"
                    >
                      {user.display_name ? (
                        <User className="h-4 w-4 text-primary" />
                      ) : (
                        <Mail className="h-4 w-4 text-primary" />
                      )}
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {user.display_name || 'Unnamed User'}
                        </span>
                        {user.email && (
                          <span className="text-xs text-muted-foreground">
                            {user.email}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground bg-background/50 rounded-lg p-4 border">
              No active DM users available
            </div>
          )}
        </div>

        <div className="mt-2">
          <h4 className="text-sm font-medium mb-1">Direct Messaging</h4>
          <p className="text-sm text-muted-foreground">
            Connect with Slack users through direct messages
          </p>
        </div>
      </div>
    </div>
  );
};