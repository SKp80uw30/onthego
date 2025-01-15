import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SlackChannelsCard } from './SlackChannelsCard';
import { SlackDMUsersCard } from './SlackDMUsersCard';
import { VapiSection } from '../vapi/VapiSection';
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
  vapiKeys?: {
    VAPI_PUBLIC_KEY: string;
    VAPI_ASSISTANT_KEY: string;
  };
  isLoadingVapi?: boolean;
  vapiError?: Error | null;
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
  vapiKeys,
  isLoadingVapi,
  vapiError,
}: OnboardingCardsProps) => {
  return (
    <AnimatePresence mode="popLayout">
      <VapiSection 
        vapiKeys={vapiKeys}
        isLoadingVapi={isLoadingVapi}
        vapiError={vapiError}
      />

      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="grid grid-cols-2 gap-4"
      >
        <div className="min-w-0">
          <SlackChannelsCard
            hasConnectedChannels={hasConnectedChannels}
            channels={channels}
            isLoading={isLoadingAccounts || isLoadingChannels}
            needsReauth={needsReauth}
          />
        </div>
        <div className="min-w-0">
          <SlackDMUsersCard
            dmUsers={dmUsers}
            isLoading={isLoadingAccounts || isLoadingDMUsers}
            needsReauth={needsReauth}
          />
        </div>
      </motion.div>
    </AnimatePresence>
  );
};