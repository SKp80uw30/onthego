import React from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { VoiceButton } from '@/components/VoiceButton';
import { OnboardingCard } from '@/components/OnboardingCard';
import { MessageSquare, Mic, Slack, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';
import { useIsMobile } from '@/hooks/use-mobile';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';

const Index = () => {
  const [isListening, setIsListening] = useState(false);
  const [session, setSession] = useState(null);
  const navigate = useNavigate();
  const isMobile = useIsMobile();

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
    enabled: !!session,
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        toast.success('Successfully logged in!');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success('Successfully logged out!');
    } catch (error) {
      toast.error('Error logging out');
    }
  };

  const handleStartListening = () => {
    setIsListening(true);
    // TODO: Implement voice recognition
  };

  const handleStopListening = () => {
    setIsListening(false);
    // TODO: Stop voice recognition
  };

  const handleConnectSlack = async () => {
    const clientId = 'your-client-id'; // Replace with env variable in production
    const redirectUri = `${window.location.origin}/`;
    const scope = 'channels:history channels:read chat:write users:read';
    
    const state = Math.random().toString(36).substring(7);
    localStorage.setItem('slack_oauth_state', state);
    
    const slackUrl = `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=${scope}&redirect_uri=${redirectUri}&state=${state}`;
    window.location.href = slackUrl;
  };

  const handleSlackCallback = async (code: string) => {
    try {
      const response = await supabase.functions.invoke('slack-oauth', {
        body: { code },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      toast.success('Successfully connected to Slack!');
    } catch (error) {
      console.error('Error connecting to Slack:', error);
      toast.error('Failed to connect to Slack');
    }
  };

  // Handle OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const savedState = localStorage.getItem('slack_oauth_state');

    if (code && state && state === savedState) {
      handleSlackCallback(code);
      // Clean URL and state
      window.history.replaceState({}, document.title, window.location.pathname);
      localStorage.removeItem('slack_oauth_state');
    }
  }, []);

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight mb-2">Welcome Back</h1>
            <p className="text-muted-foreground">Sign in to manage your Slack messages</p>
          </div>
          <Auth
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: '#8B5CF6',
                    brandAccent: '#7C3AED',
                  },
                },
              },
            }}
            providers={[]}
            view="magic_link"
            showLinks={true}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <div className="container mx-auto px-4 py-6 md:py-8">
        <div className="flex justify-between items-center mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-3"
          >
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              On-the-Go AI
            </h1>
            <p className="text-base md:text-lg text-muted-foreground max-w-md">
              Manage your Slack messages hands-free with voice commands
            </p>
          </motion.div>
          <Button 
            variant="outline" 
            onClick={handleLogout}
            className="gap-2"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>

        <div className="grid gap-4 md:gap-6 mb-8">
          <OnboardingCard
            title="Connect Slack"
            description={slackAccounts?.length ? "Connected to Slack workspace" : "Link your Slack workspace to get started"}
            icon={<Slack className="h-5 w-5 md:h-6 md:w-6 text-primary" />}
            action={
              !slackAccounts?.length && (
                <Button 
                  onClick={handleConnectSlack}
                  className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white"
                >
                  Connect Slack
                </Button>
              )
            }
          />
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

        <div className={`fixed ${isMobile ? 'bottom-6 right-6' : 'bottom-8 right-8'}`}>
          <VoiceButton
            isListening={isListening}
            onStart={handleStartListening}
            onStop={handleStopListening}
            className="shadow-xl"
          />
        </div>
      </div>
    </div>
  );
};

export default Index;