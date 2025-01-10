import React from 'react';
import { MessageSquare, Slack } from 'lucide-react';
import { OnboardingCard } from '@/components/OnboardingCard';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ConnectedChannels } from '@/components/slack/ConnectedChannels';
import { useSessionContext } from '@supabase/auth-helpers-react';

export const OnboardingSection = () => {
  const { session } = useSessionContext();

  // Fetch Slack accounts with detailed error logging
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

  // Fetch connected channels when we have a slack account
  const { data: channelsData, isLoading: isLoadingChannels, error: channelsError } = useQuery({
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
        // If we get an account_inactive error, delete the slack account
        if (error.message.includes('account_inactive')) {
          console.log('Invalid token detected, removing Slack account');
          const { error: deleteError } = await supabase
            .from('slack_accounts')
            .delete()
            .eq('id', slackAccounts[0].id);
          
          if (deleteError) {
            console.error('Error deleting invalid slack account:', deleteError);
          } else {
            console.log('Successfully deleted invalid Slack account');
            // Refetch slack accounts to update the UI
            refetchSlackAccounts();
            toast.error('Slack connection expired. Please reconnect.');
          }
        }
        throw error;
      }
      
      console.log('Channels fetched:', data);
      return data;
    },
    enabled: Boolean(slackAccounts?.[0]?.id),
  });

  const handleConnectSlack = async () => {
    try {
      console.log('Initiating Slack OAuth flow...');
      const { data: { secrets }, error } = await supabase.functions.invoke('get-slack-client-id');
      if (error) throw error;
      
      const clientId = secrets.SLACK_CLIENT_ID;
      // Use the exact path that was originally configured in Slack
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

  // Check if we have a valid Slack account (not loading and exists)
  const hasValidSlackAccount = !isLoadingAccounts && Boolean(slackAccounts?.length);
  
  // Check if we have connected channels (not loading, no error, and channels exist)
  const hasConnectedChannels = !isLoadingChannels && !channelsError && Boolean(channelsData?.channels?.length);
  
  // Get workspace name if available
  const workspaceName = slackAccounts?.[0]?.slack_workspace_name;

  return (
    <div className="grid gap-4 md:gap-6 mb-8">
      <OnboardingCard
        title="Connect Slack"
        description={workspaceName ? `Connected to ${workspaceName}` : "Link your Slack workspace to get started"}
        icon={<Slack className="h-5 w-5 md:h-6 md:w-6 text-primary" />}
        isCompleted={hasValidSlackAccount}
      >
        <Button 
          onClick={handleConnectSlack}
          className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white"
          disabled={isLoadingAccounts}
        >
          {hasValidSlackAccount ? `Connected to ${workspaceName}` : "Connect Slack"}
        </Button>
      </OnboardingCard>

      <OnboardingCard
        title="Slack Channels"
        description="Manage your connected Slack channels"
        icon={<MessageSquare className="h-5 w-5 md:h-6 md:w-6 text-primary" />}
        isCompleted={hasConnectedChannels}
      >
        <ConnectedChannels 
          channels={channelsData?.channels || []} 
          isLoading={isLoadingAccounts || isLoadingChannels}
        />
      </OnboardingCard>

      <OnboardingCard
        title="Go to Chat"
        description="Start chatting with your Slack channels"
        icon={<MessageSquare className="h-5 w-5 md:h-6 md:w-6 text-primary" />}
        isDisabled={!hasValidSlackAccount || !hasConnectedChannels}
      >
        <Link to="/chat" className="block">
          <Button 
            className="w-full bg-[#8B5CF6] hover:bg-[#7C3AED] text-white disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!hasValidSlackAccount || !hasConnectedChannels}
          >
            Go to Chat
          </Button>
        </Link>
      </OnboardingCard>
    </div>
  );
};