import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const initiateSlackOAuth = async (needsReauth: boolean = false) => {
  try {
    console.log('Initiating Slack OAuth flow...');
    const { data: { secrets }, error } = await supabase.functions.invoke('get-slack-client-id');
    if (error) throw error;
    
    const clientId = secrets.SLACK_CLIENT_ID;
    const redirectUri = typeof window !== 'undefined' 
      ? window.location.origin 
      : 'https://preview--onthego-vapi.lovable.app';
    
    console.log('Using redirect URI:', redirectUri);
    
    const scope = 'channels:history,channels:read,chat:write,users:read,channels:join,groups:read,im:history,im:write';
    
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

export const handleOAuthCallback = async () => {
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