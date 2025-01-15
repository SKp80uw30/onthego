import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SlackChannelsCard } from './SlackChannelsCard';
import { SlackDMUsersCard } from './SlackDMUsersCard';
import type { SlackChannel, SlackDMUser } from '@/hooks/use-slack-data';

interface OnboardingCardsProps {
  isLoadingAccounts: boolean;
  isLoadingChannels: boolean;
  isLoadingDMUsers: boolean;
  hasValidSlackAccount: boolean;
  hasConnectedChannels: boolean;
  workspaceName?: string;
  needsReauth?: boolean;
  isChatActive: boolean;
  channels: SlackChannel[];
  dmUsers: SlackDMUser[];
}

export const OnboardingCards = ({
  isLoadingAccounts,
  isLoadingChannels,
  isLoadingDMUsers,
  hasValidSlackAccount,
  hasConnectedChannels,
  needsReauth,
  channels,
  dmUsers,
}: OnboardingCardsProps) => {
  return (
    <AnimatePresence mode="popLayout">
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.4 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        <div className="space-y-4">
          <SlackChannelsCard
            hasConnectedChannels={hasConnectedChannels}
            channels={channels}
            isLoading={isLoadingAccounts || isLoadingChannels}
            needsReauth={needsReauth}
          />
        </div>
        <div className="space-y-4">
          <SlackDMUsersCard
            dmUsers={dmUsers}
            isLoading={isLoadingAccounts || isLoadingDMUsers}
            needsReauth={needsReauth}
          />
        </div>
      </motion.div>
      
      {/* Placeholder for VAPI Chat Window */}
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="mt-4 p-6 rounded-xl bg-white/80 backdrop-blur-sm border border-gray-200 shadow-lg"
      >
        <div className="text-center p-8">
          <h3 className="text-lg font-semibold mb-2">Voice Assistant</h3>
          <p className="text-muted-foreground">
            VAPI Chat integration coming soon...
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};