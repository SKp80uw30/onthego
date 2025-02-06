import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const initiateSlackOAuth = async (needsReauth: boolean = false) => {
  try {
    console.log('Initiating Slack OAuth flow...', { needsReauth });
    const { data: { secrets }, error } = await supabase.functions.invoke('get-slack-client-id');
    if (error) {
      console.error('Error fetching client ID:', error);
      throw error;
    }
    
    const clientId = secrets.SLACK_CLIENT_ID;
    if (!clientId) {
      console.error('No client ID found in response');
      throw new Error('Missing Slack client configuration');
    }

    const redirectUri = typeof window !== 'undefined' 
      ? `${window.location.origin}/` 
      : 'https://preview--onthego-vapi.lovable.app/';
    
    console.log('Using redirect URI:', redirectUri);
    
    // Updated scopes to include user token scopes
    const scope = [
      'channels:history',
      'channels:read',
      'chat:write',
      'users:read',
      'channels:join',
      'groups:read',
      'im:history',
      'im:write',
      'mpim:write',
      'im:read',
      'mpim:read',
      'chat:write:user',
      'client'
    ].join(',');
    
    const state = Math.random().toString(36).substring(7);
    localStorage.setItem('slack_oauth_state', state);
    localStorage.setItem('slack_reconnect', needsReauth ? 'true' : 'false');
    
    // Add team parameter to restrict to single workspace
    const slackUrl = `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=${scope}&user_scope=${scope}&redirect_uri=${redirectUri}&state=${state}&team=T06QXMXV6KX`;
    
    console.log('Redirecting to Slack OAuth URL:', slackUrl);
    window.location.href = slackUrl;
  } catch (error) {
    console.error('Error initiating Slack OAuth:', error);
    toast.error('Failed to connect to Slack. Please try again.');
  }
};

export const handleOAuthCallback = async () => {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const error = urlParams.get('error');
    const storedState = localStorage.getItem('slack_oauth_state');
    const isReconnect = localStorage.getItem('slack_reconnect') === 'true';

    console.log('Processing OAuth callback:', { 
      hasCode: !!code, 
      hasState: !!state, 
      stateMatch: state === storedState,
      isReconnect,
      error 
    });

    if (error) {
      throw new Error(`Slack OAuth error: ${error}`);
    }

    if (code && state && state === storedState) {
      const redirectUri = typeof window !== 'undefined' 
        ? `${window.location.origin}/`
        : 'https://preview--onthego-vapi.lovable.app/';

      const { error: functionError } = await supabase.functions.invoke('slack-oauth', {
        body: { 
          code,
          isReconnect,
          redirectUri
        }
      });

      if (functionError) {
        console.error('Error in OAuth callback:', functionError);
        throw functionError;
      }

      localStorage.removeItem('slack_oauth_state');
      localStorage.removeItem('slack_reconnect');

      toast.success(isReconnect ? 'Successfully reconnected to Slack!' : 'Successfully connected to Slack!');

      // Clean up URL parameters and refresh the page
      window.history.replaceState({}, document.title, window.location.pathname);
      window.location.reload();
    } else {
      throw new Error('Invalid OAuth state or missing code');
    }
  } catch (error) {
    console.error('Error in OAuth callback:', error);
    toast.error(`Failed to complete Slack connection: ${error.message}`);
    
    // Clean up storage and URL even on error
    localStorage.removeItem('slack_oauth_state');
    localStorage.removeItem('slack_reconnect');
    window.history.replaceState({}, document.title, window.location.pathname);
  }
};