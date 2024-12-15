import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { VoiceButton } from '@/components/VoiceButton';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';
import { LoginForm } from '@/components/auth/LoginForm';
import { Header } from '@/components/dashboard/Header';
import { OnboardingSection } from '@/components/dashboard/OnboardingSection';

const Index = () => {
  const [isListening, setIsListening] = useState(false);
  const [session, setSession] = useState(null);
  const isMobile = useIsMobile();

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

  const handleStartListening = () => {
    setIsListening(true);
    // TODO: Implement voice recognition
  };

  const handleStopListening = () => {
    setIsListening(false);
    // TODO: Stop voice recognition
  };

  // Handle OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const savedState = localStorage.getItem('slack_oauth_state');

    if (code && state && state === savedState) {
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

      handleSlackCallback(code);
      // Clean URL and state
      window.history.replaceState({}, document.title, window.location.pathname);
      localStorage.removeItem('slack_oauth_state');
    }
  }, []);

  if (!session) {
    return <LoginForm />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <div className="container mx-auto px-4 py-6 md:py-8">
        <Header />
        <OnboardingSection />
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