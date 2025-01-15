import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SlackChannel {
  id: string;
  name: string;
}

export const useSlackChannels = (slackAccountId?: string) => {
  const { 
    data: channelsData, 
    isLoading: isLoadingChannels, 
    refetch: refetchChannels 
  } = useQuery({
    queryKey: ['slack-channels', slackAccountId],
    queryFn: async () => {
      if (!slackAccountId) {
        console.log('No slack account found, skipping channel fetch');
        return { channels: [] };
      }
      
      console.log('Fetching channels for account:', slackAccountId);
      const { data, error } = await supabase.functions.invoke('fetch-slack-channels', {
        body: { slackAccountId }
      });
      
      if (error) {
        console.error('Error fetching channels:', error);
        throw error;
      }
      
      console.log('Channels fetched:', data);
      return data;
    },
    enabled: Boolean(slackAccountId),
    refetchInterval: 30000,
  });

  const hasConnectedChannels = !isLoadingChannels && Boolean(channelsData?.channels?.length);

  return {
    channels: channelsData?.channels || [],
    isLoadingChannels,
    hasConnectedChannels,
    refetchChannels,
  };
};