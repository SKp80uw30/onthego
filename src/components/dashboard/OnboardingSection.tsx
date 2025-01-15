import React from 'react';
import { useSlackData } from '@/hooks/use-slack-data';
import { OnboardingCards } from './slack/OnboardingCards';
import { Header } from './Header';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';

export const OnboardingSection = () => {
  const {
    isLoadingAccounts,
    isLoadingChannels,
    isLoadingDMUsers,
    hasValidSlackAccount,
    hasConnectedChannels,
    workspaceName,
    needsReauth,
    isChatActive,
    channels,
    dmUsers,
    refetchSlackAccounts,
    refetchChannels,
  } = useSlackData();

  const { data: vapiKeys, isLoading: isLoadingVapi, error: vapiError } = useQuery({
    queryKey: ['vapi-keys'],
    queryFn: async () => {
      console.log('Fetching VAPI keys from Edge Function...');
      const { data, error } = await supabase.functions.invoke('get-vapi-keys');
      
      if (error) {
        console.error('Error fetching VAPI keys:', error);
        toast.error('Failed to initialize voice service');
        throw error;
      }
      
      if (!data?.secrets?.VAPI_PUBLIC_KEY || !data?.secrets?.VAPI_ASSISTANT_KEY) {
        console.error('Missing required VAPI configuration in response:', data);
        throw new Error('Missing required VAPI configuration');
      }
      
      console.log('VAPI keys fetched successfully');
      return {
        VAPI_PUBLIC_KEY: data.secrets.VAPI_PUBLIC_KEY,
        VAPI_ASSISTANT_KEY: data.secrets.VAPI_ASSISTANT_KEY
      };
    },
  });

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

  return (
    <div className="grid gap-4 md:gap-6">
      <Header 
        isLoadingAccounts={isLoadingAccounts}
        hasValidSlackAccount={hasValidSlackAccount}
        workspaceName={workspaceName}
        needsReauth={needsReauth}
        onConnectSlack={handleConnectSlack}
      />
      <OnboardingCards
        isLoadingAccounts={isLoadingAccounts}
        isLoadingChannels={isLoadingChannels}
        isLoadingDMUsers={isLoadingDMUsers}
        hasValidSlackAccount={hasValidSlackAccount}
        hasConnectedChannels={hasConnectedChannels}
        workspaceName={workspaceName}
        needsReauth={needsReauth}
        isChatActive={isChatActive}
        channels={channels}
        dmUsers={dmUsers}
        vapiKeys={vapiKeys}
        isLoadingVapi={isLoadingVapi}
        vapiError={vapiError}
      />
    </div>
  );
};