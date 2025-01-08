import React from 'react';
import { Slack } from 'lucide-react';
import { OnboardingCard } from '@/components/OnboardingCard';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { ConnectedWorkspace } from './ConnectedWorkspace';
import { ConnectedChannels } from './ConnectedChannels';

export const OnboardingSection = () => {
  const { data: slackAccounts } = useQuery({
    queryKey: ['slack-accounts'],
    queryFn: async () => {
      console.log('Fetching slack accounts...');
      const { data, error } = await supabase
        .from('slack_accounts')
        .select('*');
      
      if (error) {
        console.error('Error fetching slack accounts:', error);
        throw error;
      }
      
      console.log('Slack accounts fetched:', data);
      return data;
    },
  });

  const handleConnectSlack = async () => {
    try {
      const { data: { secrets }, error } = await supabase.functions.invoke('get-slack-client-id');
      if (error) throw error;
      
      const clientId = secrets.SLACK_CLIENT_ID;
      const redirectUri = `${window.location.origin}${window.location.pathname}`;
      const scope = 'channels:history channels:read chat:write users:read';
      
      const state = Math.random().toString(36).substring(7);
      localStorage.setItem('slack_oauth_state', state);
      
      const slackUrl = `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=${scope}&redirect_uri=${redirectUri}&state=${state}`;
      window.location.href = slackUrl;
    } catch (error) {
      console.error('Error initiating Slack OAuth:', error);
      toast.error('Failed to connect to Slack');
    }
  };

  if (!slackAccounts?.length) {
    return (
      <OnboardingCard
        title="Connect Slack"
        description="Link your Slack workspace to get started"
        icon={<Slack className="h-5 w-5 md:h-6 md:w-6 text-primary" />}
        className="mb-8"
      >
        <Button 
          onClick={handleConnectSlack}
          className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white"
        >
          Connect Slack
        </Button>
      </OnboardingCard>
    );
  }

  return (
    <div className="space-y-6 mb-8">
      <ConnectedWorkspace 
        workspaceName={slackAccounts[0].slack_workspace_name || 'Unknown'} 
      />
      <ConnectedChannels channels={[]} /> {/* TODO: Implement channel fetching */}
    </div>
  );
};