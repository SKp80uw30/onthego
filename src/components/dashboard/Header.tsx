import React from 'react';
import { LogOut, Slack } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface HeaderProps {
  isLoadingAccounts: boolean;
  hasValidSlackAccount: boolean;
  workspaceName?: string;
  needsReauth?: boolean;
  onConnectSlack: () => void;
}

export const Header = ({
  isLoadingAccounts,
  hasValidSlackAccount,
  workspaceName,
  needsReauth,
  onConnectSlack,
}: HeaderProps) => {
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success('Successfully logged out!');
    } catch (error) {
      toast.error('Error logging out');
    }
  };

  const buttonText = needsReauth 
    ? "Reconnect to Slack" 
    : hasValidSlackAccount 
      ? `Connected to ${workspaceName}` 
      : "Connect to Slack";

  return (
    <div className="flex flex-col gap-4 mb-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-3"
      >
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              On-the-Go AI
            </h1>
            <p className="text-sm md:text-base text-muted-foreground">
              Manage your Slack messages hands-free with voice commands
            </p>
          </div>
          <div className="flex flex-col gap-2 items-end">
            <Button 
              variant="outline" 
              onClick={handleLogout}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
            <Button 
              onClick={onConnectSlack}
              className={cn(
                "transition-all duration-300",
                hasValidSlackAccount && !needsReauth
                  ? "bg-gray-100 hover:bg-gray-200 text-gray-600"
                  : "bg-[#8B5CF6] hover:bg-[#7C3AED] text-white"
              )}
              disabled={isLoadingAccounts || (hasValidSlackAccount && !needsReauth)}
              size="sm"
            >
              <Slack className="h-4 w-4 mr-2" />
              {buttonText}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};