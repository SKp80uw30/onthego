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
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);

  useEffect(() => {
    // Initialize Web Speech API
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognitionAPI();
      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = false;
      recognitionInstance.lang = 'en-US';

      recognitionInstance.onresult = async (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript;
        console.log('Voice command:', transcript);
        
        try {
          const { data: slackAccounts } = await supabase
            .from('slack_accounts')
            .select('*')
            .limit(1)
            .single();

          if (!slackAccounts) {
            toast.error('Please connect your Slack workspace first');
            return;
          }

          // Send message to Slack
          const response = await supabase.functions.invoke('send-slack-message', {
            body: { message: transcript }
          });

          if (response.error) {
            throw new Error(response.error.message);
          }

          toast.success('Message sent to Slack!');
        } catch (error) {
          console.error('Error sending message:', error);
          toast.error('Failed to send message to Slack');
        }

        setIsListening(false);
      };

      recognitionInstance.onerror = (event: Event) => {
        console.error('Speech recognition error:', event);
        toast.error('Voice recognition error. Please try again.');
        setIsListening(false);
      };

      setRecognition(recognitionInstance);
    } else {
      toast.error('Speech recognition is not supported in this browser');
    }
  }, []);

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
    if (recognition) {
      recognition.start();
      setIsListening(true);
    }
  };

  const handleStopListening = () => {
    if (recognition) {
      recognition.stop();
      setIsListening(false);
    }
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