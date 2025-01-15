import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SlackChannelsCard } from './SlackChannelsCard';
import { SlackDMUsersCard } from './SlackDMUsersCard';
import { VapiFrame } from '@/components/vapi/VapiFrame';
import { OnboardingCard } from '@/components/OnboardingCard';
import { Mic } from 'lucide-react';
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
      {/* VAPI Integration */}
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.4 }}
        className="mb-4"
      >
        <OnboardingCard
          title="Voice Assistant"
          description="Use voice commands to interact with your Slack workspace"
          icon={<Mic className="h-5 w-5 text-primary" />}
          content={
            isLoadingVapi ? (
              <div className="text-center p-8">
                <h3 className="text-lg font-semibold mb-2">Loading Voice Assistant...</h3>
              </div>
            ) : vapiError ? (
              <div className="text-center p-8">
                <h3 className="text-lg font-semibold mb-2">Voice Assistant Error</h3>
                <p className="text-muted-foreground">{vapiError.message}</p>
              </div>
            ) : vapiKeys ? (
              <VapiFrame 
                apiKey={vapiKeys.VAPI_PUBLIC_KEY}
                assistantId={vapiKeys.VAPI_ASSISTANT_KEY}
              />
            ) : (
              <div className="text-center p-8">
                <h3 className="text-lg font-semibold mb-2">Voice Assistant</h3>
                <p className="text-muted-foreground">
                  Failed to load VAPI configuration
                </p>
              </div>
            )
          }
        />
      </motion.div>

      {/* Slack Channels and DM Users */}
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.4, delay: 0.2 }}
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
    </AnimatePresence>
  );
};