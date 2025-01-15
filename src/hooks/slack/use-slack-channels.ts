import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { SlackChannel } from '@/types/slack';

export const useSlackChannels = (slackAccountId?: string) => {
  const {
    data: channels,
    isLoading: isLoadingChannels,
    refetch: refetchChannels,
  } = useQuery({
    queryKey: ['slack-channels', slackAccountId],
    queryFn: async () => {
      if (!slackAccountId) {
        console.log('No slack account found, skipping channel fetch');
        return [];
      }
      
      console.log('Fetching Slack channels for account:', slackAccountId);
      const { data, error } = await supabase.functions.invoke('fetch-slack-channels', {
        body: { slackAccountId }
      });

      if (error) {
        console.error('Error fetching Slack channels:', error);
        throw error;
      }

      console.log('Channels fetched:', data?.channels?.length);
      return data.channels as SlackChannel[];
    },
    enabled: Boolean(slackAccountId),
  });

  return {
    channels: channels ?? [],
    isLoadingChannels,
    refetchChannels,
    hasConnectedChannels: (channels?.length ?? 0) > 0,
  };
};