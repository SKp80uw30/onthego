import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { VoiceButton } from '@/components/VoiceButton';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';
import { LoginForm } from '@/components/auth/LoginForm';
import { Header } from '@/components/dashboard/Header';
import { OnboardingSection } from '@/components/dashboard/OnboardingSection';
import { useRealtimeChat } from '@/hooks/use-realtime-chat';

const Index = () => {
  const [isListening, setIsListening] = useState(false);
  const [session, setSession] = useState(null);
  const isMobile = useIsMobile();
  const { audioService, isInitialized } = useRealtimeChat();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Current session:', session ? 'Active' : 'None');
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('Auth state changed:', _event);
      setSession(session);
      if (session) {
        toast.success('Successfully logged in!');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleStartListening = async () => {
    if (!session) {
      toast.error('Please log in to use this feature');
      return;
    }

    if (!audioService || !isInitialized) {
      toast.error('Audio service not ready. Please try again.');
      return;
    }

    try {
      console.log('Starting voice detection...');
      await audioService.startListening();
      setIsListening(true);
    } catch (error) {
      console.error('Error starting voice detection:', error);
      toast.error('Error accessing microphone. Please check permissions.');
      setIsListening(false);
    }
  };

  const handleStopListening = () => {
    console.log('Stopping voice detection...');
    if (audioService) {
      audioService.stopListening();
    }
    setIsListening(false);
  };

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