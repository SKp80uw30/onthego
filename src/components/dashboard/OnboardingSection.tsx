import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSessionContext } from '@supabase/auth-helpers-react';
import { supabase } from '@/integrations/supabase/client';
import { ConnectSlackCard } from './slack/ConnectSlackCard';
import { SlackChannelsCard } from './slack/SlackChannelsCard';
import { ChatNavigationCard } from './slack/ChatNavigationCard';
import { motion, AnimatePresence } from 'framer-motion';

export const OnboardingSection = () => {
  const { session } = useSessionContext();

  const { data: slackAccounts, isLoading: isLoadingAccounts, refetch: refetchSlackAccounts } = useQuery({
    queryKey: ['slack-accounts', session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) {
        console.log('No active session, skipping fetch');
        return [];
      }
      
      console.log('Fetching slack accounts...');
      const { data, error } = await supabase
        .from('slack_accounts')
        .select('*')
        .eq('user_id', session.user.id);
      
      if (error) {
        console.error('Error fetching slack accounts:', error);
        throw error;
      }
      
      console.log('Slack accounts fetched:', data);
      return data || [];
    },
    enabled: !!session?.user?.id,
  });

  const { data: channelsData, isLoading: isLoadingChannels, refetch: refetchChannels } = useQuery({
    queryKey: ['slack-channels', slackAccounts?.[0]?.id],
    queryFn: async () => {
      if (!slackAccounts?.[0]?.id) {
        console.log('No slack account found, skipping channel fetch');
        return { channels: [] };
      }
      
      console.log('Fetching channels for account:', slackAccounts[0].id);
      const { data, error } = await supabase.functions.invoke('fetch-slack-channels', {
        body: { slackAccountId: slackAccounts[0].id }
      });
      
      if (error) {
        console.error('Error fetching channels:', error);
        throw error;
      }
      
      console.log('Channels fetched:', data);
      return data;
    },
    enabled: Boolean(slackAccounts?.[0]?.id),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const hasValidSlackAccount = !isLoadingAccounts && Boolean(slackAccounts?.length);
  const hasConnectedChannels = !isLoadingChannels && Boolean(channelsData?.channels?.length);
  const workspaceName = slackAccounts?.[0]?.slack_workspace_name;
  const needsReauth = slackAccounts?.[0]?.needs_reauth;
  const isChatActive = hasValidSlackAccount && hasConnectedChannels && !needsReauth;

  // Add refetch on focus
  React.useEffect(() => {
    const refetchData = async () => {
      if (hasValidSlackAccount) {
        console.log('Refetching data on window focus');
        await Promise.all([refetchSlackAccounts(), refetchChannels()]);
      }
    };

    window.addEventListener('focus', refetchData);
    return () => window.removeEventListener('focus', refetchData);
  }, [hasValidSlackAccount, refetchSlackAccounts, refetchChannels]);

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
        channels={channelsData?.channels || []}
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

    // If chat is active, move ChatNavigationCard to the top
    if (isChatActive) {
      const chatCard = cards.pop();
      cards.unshift(chatCard!);
    }

    return cards;
  };

  return (
    <div className="grid gap-4 md:gap-6 mb-8">
      <AnimatePresence>
        {renderCards().map((card, index) => (
          <motion.div
            key={card.key}
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            {card}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};