import React from 'react';
import { Slack } from 'lucide-react';
import { OnboardingCard } from '@/components/OnboardingCard';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ConnectSlackCardProps {
  isLoadingAccounts: boolean;
  hasValidSlackAccount: boolean;
  workspaceName?: string;
}

export const ConnectSlackCard = ({
  isLoadingAccounts,
  hasValidSlackAccount,
  workspaceName,
}: ConnectSlackCardProps) => {
  const handleConnectSlack = async () => {
    try {
      console.log('Initiating Slack OAuth flow...');
      const { data: { secrets }, error } = await supabase.functions.invoke('get-slack-client-id');
      if (error) throw error;
      
      const clientId = secrets.SLACK_CLIENT_ID;
      const redirectUri = 'https://preview--onthego-vapi.lovable.app';
      const scope = 'channels:history,channels:read,chat:write,users:read,channels:join,groups:read';
      
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
    <OnboardingCard
      title="Connect Slack"
      description=""
      icon={<Slack className="h-5 w-5 md:h-6 md:w-6 text-primary" />}
      isCompleted={hasValidSlackAccount}
    >
      <Button 
        onClick={handleConnectSlack}
        className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white"
        disabled={isLoadingAccounts}
      >
        {hasValidSlackAccount ? `Connected to ${workspaceName}` : "Connect to Slack"}
      </Button>
    </OnboardingCard>
  );
};