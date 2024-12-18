import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { VoiceButton } from '@/components/VoiceButton';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';
import { LoginForm } from '@/components/auth/LoginForm';
import { Header } from '@/components/dashboard/Header';
import { OnboardingSection } from '@/components/dashboard/OnboardingSection';
import { AudioService } from '@/services/AudioService';
import { OpenAIService } from '@/services/OpenAIService';

const Index = () => {
  const [isListening, setIsListening] = useState(false);
  const [session, setSession] = useState(null);
  const [audioService] = useState(() => new AudioService());
  const [openAIService] = useState(() => new OpenAIService());
  const isMobile = useIsMobile();

  useEffect(() => {
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
        // Fetch default workspace when user logs in
        await fetchDefaultWorkspace(session.user.id);
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
      openAIService.cleanup();
    };
  }, [audioService, openAIService]);

  const fetchDefaultWorkspace = async (userId: string) => {
    try {
      // First try to get user settings
      const { data: settings, error: settingsError } = await supabase
        .from('settings')
        .select('default_workspace_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (settingsError) {
        console.error('Error fetching settings:', settingsError);
      }

      if (settings?.default_workspace_id) {
        console.log('Found default workspace:', settings.default_workspace_id);
        openAIService.setSlackAccountId(settings.default_workspace_id);
        return;
      }

      // If no settings or no default workspace, try to get the first available workspace
      const { data: workspaces, error: workspacesError } = await supabase
        .from('slack_accounts')
        .select('id')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle();

      if (workspacesError) {
        console.error('Error fetching workspaces:', workspacesError);
        return;
      }

      if (workspaces?.id) {
        console.log('Using first available workspace:', workspaces.id);
        openAIService.setSlackAccountId(workspaces.id);
        
        // Create settings with this workspace as default
        const { error: createError } = await supabase
          .from('settings')
          .upsert({
            user_id: userId,
            default_workspace_id: workspaces.id
          });

        if (createError) {
          console.error('Error creating settings:', createError);
          toast.error('Failed to save workspace settings');
        }
      } else {
        console.log('No Slack workspace connected');
        toast.error('Please connect a Slack workspace to use voice commands');
      }
    } catch (error) {
      console.error('Error in fetchDefaultWorkspace:', error);
      toast.error('Failed to fetch workspace settings');
    }
  };

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