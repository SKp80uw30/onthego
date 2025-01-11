import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ConnectSlackCard } from './ConnectSlackCard';
import { SlackChannelsCard } from './SlackChannelsCard';
import { ChatNavigationCard } from './ChatNavigationCard';
import type { SlackChannel } from '@/hooks/use-slack-data';

interface OnboardingCardsProps {
  isLoadingAccounts: boolean;
  isLoadingChannels: boolean;
  hasValidSlackAccount: boolean;
  hasConnectedChannels: boolean;
  workspaceName?: string;
  needsReauth?: boolean;
  isChatActive: boolean;
  channels: SlackChannel[];
}

export const OnboardingCards = ({
  isLoadingAccounts,
  isLoadingChannels,
  hasValidSlackAccount,
  hasConnectedChannels,
  workspaceName,
  needsReauth,
  isChatActive,
  channels,
}: OnboardingCardsProps) => {
  const renderCards = () => {
    const cards = [
      <ConnectSlackCard
        key="connect-slack"
        isLoadingAccounts={isLoadingAccounts}
        hasValidSlackAccount={hasValidSlackAccount}
        workspaceName={workspaceName}
        needsReauth={needsReauth}
      />,
      <SlackChannelsCard
        key="slack-channels"
        hasConnectedChannels={hasConnectedChannels}
        channels={channels}
        isLoading={isLoadingAccounts || isLoadingChannels}
        needsReauth={needsReauth}
      />,
      <ChatNavigationCard
        key="chat-navigation"
        hasValidSlackAccount={hasValidSlackAccount}
        hasConnectedChannels={hasConnectedChannels}
        needsReauth={needsReauth}
      />
    ];

    if (isChatActive) {
      const chatCard = cards.pop();
      cards.unshift(chatCard!);
    }

    return cards;
  };

  return (
    <AnimatePresence mode="popLayout">
      {renderCards().map((card, index) => (
        <motion.div
          key={card.key}
          layout
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ 
            duration: 0.4,
            delay: index * 0.1,
            layout: {
              type: "spring",
              stiffness: 300,
              damping: 30
            }
          }}
        >
          {card}
        </motion.div>
      ))}
    </AnimatePresence>
  );
};