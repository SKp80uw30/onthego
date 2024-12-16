import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { VoiceButton } from '@/components/VoiceButton';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';
import { LoginForm } from '@/components/auth/LoginForm';
import { Header } from '@/components/dashboard/Header';
import { OnboardingSection } from '@/components/dashboard/OnboardingSection';
import { AudioService } from '@/services/AudioService';

const Index = () => {
  const [isListening, setIsListening] = useState(false);
  const [session, setSession] = useState(null);
  const [audioService] = useState(() => new AudioService());
  const isMobile = useIsMobile();

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

    // Initialize audio service
    audioService.initialize().catch(error => {
      console.error('Failed to initialize audio service:', error);
      toast.error('Failed to initialize audio. Please check microphone permissions.');
    });

    return () => {
      subscription.unsubscribe();
      audioService.cleanup();
    };
  }, [audioService]);

  const handleStartListening = async () => {
    if (!session) {
      toast.error('Please log in to use this feature');
      return;
    }

    try {
      audioService.startRecording();
      setIsListening(true);
    } catch (error) {
      console.error('Error starting voice detection:', error);
      toast.error('Error accessing microphone. Please check permissions.');
      setIsListening(false);
    }
  };

  const handleStopListening = () => {
    try {
      audioService.stopRecording();
      setIsListening(false);
    } catch (error) {
      console.error('Error stopping voice detection:', error);
      toast.error('Error stopping recording');
    }
  };

  if (!session) {
    return <LoginForm />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <div className="container mx-auto px-4 py-6 md:py-8">
        <Header />
        <OnboardingSection />
        <div className="flex justify-center mt-8">
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