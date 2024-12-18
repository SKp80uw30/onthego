import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';
import { LoginForm } from '@/components/auth/LoginForm';
import { Header } from '@/components/dashboard/Header';
import { OnboardingSection } from '@/components/dashboard/OnboardingSection';
import { AudioService } from '@/services/AudioService';
import { VoiceSection } from '@/components/voice/VoiceSection';
import { WorkspaceInitializer } from '@/components/workspace/WorkspaceInitializer';

const Index = () => {
  const [session, setSession] = useState(null);
  const [audioService] = useState(() => new AudioService());
  const [isAudioInitialized, setIsAudioInitialized] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    const initializeAudio = async () => {
      try {
        console.log('Starting audio initialization...');
        await audioService.initialize();
        console.log('Audio initialization completed successfully');
        setIsAudioInitialized(true);
      } catch (error) {
        console.error('Failed to initialize audio service:', error);
        toast.error('Failed to initialize audio. Please check microphone permissions.');
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Current session:', session ? 'Active' : 'None');
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log('Auth state changed:', _event);
      setSession(session);
      if (session) {
        toast.success('Successfully logged in!');
      }
    });

    // Initialize audio service
    initializeAudio();

    return () => {
      subscription.unsubscribe();
      audioService.cleanup();
    };
  }, [audioService]);

  if (!session) {
    return <LoginForm />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <div className="container mx-auto px-4 py-6 md:py-8">
        <Header />
        <OnboardingSection />
        {session && (
          <WorkspaceInitializer 
            userId={session.user.id} 
            audioService={audioService}
          />
        )}
        <VoiceSection 
          session={session}
          audioService={audioService}
          isAudioInitialized={isAudioInitialized}
        />
      </div>
    </div>
  );
};

export default Index;