import React from 'react';
import { MessageSquare, Mic, Slack } from 'lucide-react';
import { OnboardingCard } from '@/components/OnboardingCard';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';

export const OnboardingSection = () => {
  // Fetch Slack accounts
  const { data: slackAccounts } = useQuery({
    queryKey: ['slack-accounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('slack_accounts')
        .select('*');
      if (error) throw error;
      return data;
    },
  });

  const handleConnectSlack = async () => {
    try {
      const { data: { secrets }, error } = await supabase.functions.invoke('get-slack-client-id');
      if (error) throw error;
      
      const clientId = secrets.SLACK_CLIENT_ID;
      const redirectUri = `https://localhost:8080/`;
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

  return (
    <div className="grid gap-4 md:gap-6 mb-8">
      <OnboardingCard
        title="Connect Slack"
        description={slackAccounts?.length ? "Connected to Slack workspace" : "Link your Slack workspace to get started"}
        icon={<Slack className="h-5 w-5 md:h-6 md:w-6 text-primary" />}
      >
        {!slackAccounts?.length && (
          <Button 
            onClick={handleConnectSlack}
            className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white"
          >
            Connect Slack
          </Button>
        )}
      </OnboardingCard>
      <OnboardingCard
        title="Voice Commands"
        description="Control your messages with simple voice commands"
        icon={<Mic className="h-5 w-5 md:h-6 md:w-6 text-primary" />}
      />
      <OnboardingCard
        title="Smart Replies"
        description="AI-powered responses for quick communication"
        icon={<MessageSquare className="h-5 w-5 md:h-6 md:w-6 text-primary" />}
      />
    </div>
  );
};