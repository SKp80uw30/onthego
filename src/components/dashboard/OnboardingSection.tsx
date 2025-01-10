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
    queryKey: ['slack-accounts', session?.user?.id], // Add session.user.id to queryKey to refetch on login/logout
    queryFn: async () => {
      if (!session?.user?.id) return null;
      
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
    enabled: !!session?.user?.id, // Only run query when user is logged in
  });

  // Fetch connected channels when we have a slack account
  const { data: channelsData, isLoading: isLoadingChannels } = useQuery({
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
        // If we get a missing_scope error, it means the token is invalid
        // We should delete the slack account
        if (error.message.includes('missing_scope')) {
          const { error: deleteError } = await supabase
            .from('slack_accounts')
            .delete()
            .eq('id', slackAccounts[0].id);
          
          if (deleteError) {
            console.error('Error deleting invalid slack account:', deleteError);
          } else {
            // Refetch slack accounts to update the UI
            refetchSlackAccounts();
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
      const { data: { secrets }, error } = await supabase.functions.invoke('get-slack-client-id');
      if (error) throw error;
      
      const clientId = secrets.SLACK_CLIENT_ID;
      const redirectUri = `${window.location.origin}${window.location.pathname}`;
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

  const workspaceName = slackAccounts?.[0]?.slack_workspace_name;
  const description = workspaceName 
    ? `Connected to ${workspaceName} Workspace`
    : "Link your Slack workspace to get started";

  return (
    <div className="grid gap-4 md:gap-6 mb-8">
      <OnboardingCard
        title="Connect Slack"
        description={description}
        icon={<Slack className="h-5 w-5 md:h-6 md:w-6 text-primary" />}
        isCompleted={Boolean(slackAccounts?.length)}
      >
        {!slackAccounts?.length ? (
          <Button 
            onClick={handleConnectSlack}
            className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white"
          >
            Connect Slack
          </Button>
        ) : (
          <Link to="/chat">
            <Button className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white">
              Go to Chat
            </Button>
          </Link>
        )}
      </OnboardingCard>
      <OnboardingCard
        title="Slack Channels Connected"
        description="Manage your connected Slack channels"
        icon={<MessageSquare className="h-5 w-5 md:h-6 md:w-6 text-primary" />}
      >
        <ConnectedChannels 
          channels={channelsData?.channels || []} 
          isLoading={isLoadingAccounts || isLoadingChannels}
        />
      </OnboardingCard>
      <OnboardingCard
        title="Smart Replies"
        description="AI-powered responses for quick communication"
        icon={<MessageSquare className="h-5 w-5 md:h-6 md:w-6 text-primary" />}
      />
    </div>
  );
};