import React, { useState } from 'react';
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
  const { wsService, audioService, isConnected } = useRealtimeChat();

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

  const handleStartListening = async () => {
    if (!wsService || !audioService || !isConnected) {
      toast.error('Connection not ready. Please try again.');
      return;
    }

    try {
      await audioService.startRecording();
      setIsListening(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Error accessing microphone. Please check permissions.');
    }
  };

  const handleStopListening = () => {
    if (audioService) {
      audioService.stopRecording();
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