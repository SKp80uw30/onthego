import React from 'react';
import { Slack } from 'lucide-react';
import { OnboardingCard } from '@/components/OnboardingCard';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ConnectSlackCardProps {
  isLoadingAccounts: boolean;
  hasValidSlackAccount: boolean;
  workspaceName?: string;
  needsReauth?: boolean;
}

export const ConnectSlackCard = ({
  isLoadingAccounts,
  hasValidSlackAccount,
  workspaceName,
  needsReauth,
}: ConnectSlackCardProps) => {
  const handleConnectSlack = async () => {
    try {
      console.log('Initiating Slack OAuth flow...');
      const { data: { secrets }, error } = await supabase.functions.invoke('get-slack-client-id');
      if (error) throw error;
      
      const clientId = secrets.SLACK_CLIENT_ID;
      const redirectUri = typeof window !== 'undefined' 
        ? window.location.origin 
        : 'https://preview--onthego-vapi.lovable.app';
      
      console.log('Using redirect URI:', redirectUri);
      
      const scope = 'channels:history,channels:read,chat:write,users:read,channels:join,groups:read';
      
      const state = Math.random().toString(36).substring(7);
      localStorage.setItem('slack_oauth_state', state);
      localStorage.setItem('slack_reconnect', needsReauth ? 'true' : 'false');
      
      const slackUrl = `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=${scope}&redirect_uri=${redirectUri}&state=${state}`;
      window.location.href = slackUrl;
    } catch (error) {
      console.error('Error initiating Slack OAuth:', error);
      toast.error('Failed to connect to Slack');
    }
  };

  React.useEffect(() => {
    const handleOAuthCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');
      const storedState = localStorage.getItem('slack_oauth_state');
      const isReconnect = localStorage.getItem('slack_reconnect') === 'true';

      if (code && state && state === storedState) {
        try {
          console.log('Processing OAuth callback...');
          const { error } = await supabase.functions.invoke('slack-oauth', {
            body: { 
              code,
              isReconnect,
              redirectUri: typeof window !== 'undefined' 
                ? window.location.origin 
                : 'https://preview--onthego-vapi.lovable.app'
            }
          });

          if (error) throw error;

          localStorage.removeItem('slack_oauth_state');
          localStorage.removeItem('slack_reconnect');

          toast.success(isReconnect ? 'Successfully reconnected to Slack!' : 'Successfully connected to Slack!');

          setTimeout(() => {
            window.location.href = window.location.origin;
          }, 1500);
        } catch (error) {
          console.error('Error in OAuth callback:', error);
          toast.error('Failed to complete Slack connection');
        }
      }
    };

    handleOAuthCallback();
  }, []);

  const buttonText = needsReauth 
    ? "Reconnect to Slack" 
    : hasValidSlackAccount 
      ? `Connected to ${workspaceName}` 
      : "Connect to Slack";

  return (
    <OnboardingCard
      title="Connect Slack"
      description={needsReauth ? "Your Slack connection needs to be renewed" : "Connect your Slack workspace to get started"}
      icon={<Slack className="h-5 w-5 md:h-6 md:w-6 text-primary" />}
      isCompleted={hasValidSlackAccount && !needsReauth}
    >
      <Button 
        onClick={handleConnectSlack}
        className={cn(
          "w-[140px] transition-all duration-300",
          hasValidSlackAccount && !needsReauth
            ? "bg-gray-100 hover:bg-gray-200 text-gray-600"
            : "bg-[#8B5CF6] hover:bg-[#7C3AED] text-white"
        )}
        disabled={isLoadingAccounts || (hasValidSlackAccount && !needsReauth)}
      >
        {buttonText}
      </Button>
    </OnboardingCard>
  );
};