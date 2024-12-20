import React, { useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { AudioService } from '@/services/AudioService';
import { useAssistantChat } from '@/hooks/use-assistant-chat';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { VoiceButton } from '@/components/VoiceButton';

interface VoiceSectionProps {
  session: Session;
  audioService: AudioService;
  isAudioInitialized: boolean;
}

export const VoiceSection: React.FC<VoiceSectionProps> = ({
  session,
  audioService,
  isAudioInitialized
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const { initializeThread, sendMessage, isLoading, threadId } = useAssistantChat();
  const [currentSlackAccountId, setCurrentSlackAccountId] = useState<string | null>(null);

  useEffect(() => {
    const setupAssistantThread = async () => {
      try {
        console.log('Setting up assistant thread for user:', session.user.id);
        
        // Get the user's default Slack account
        const { data: settings, error: settingsError } = await supabase
          .from('settings')
          .select('default_workspace_id')
          .eq('user_id', session.user.id)
          .limit(1)
          .maybeSingle();

        if (settingsError) {
          console.error('Error fetching settings:', settingsError);
          toast.error('Failed to fetch workspace settings');
          return;
        }

        if (!settings?.default_workspace_id) {
          console.log('No default workspace found, fetching first available workspace');
          const { data: accounts, error: accountsError } = await supabase
            .from('slack_accounts')
            .select('id')
            .eq('user_id', session.user.id)
            .limit(1)
            .maybeSingle();

          if (accountsError) {
            console.error('Error fetching Slack accounts:', accountsError);
            toast.error('Failed to fetch Slack workspaces');
            return;
          }

          if (accounts?.id) {
            console.log('Using workspace:', accounts.id);
            setCurrentSlackAccountId(accounts.id);
            await initializeThread(accounts.id);
          } else {
            console.warn('No Slack workspaces found');
            toast.error('No Slack workspace connected');
          }
        } else {
          console.log('Using default workspace:', settings.default_workspace_id);
          setCurrentSlackAccountId(settings.default_workspace_id);
          await initializeThread(settings.default_workspace_id);
        }
      } catch (error) {
        console.error('Error in setupAssistantThread:', error);
        toast.error('Failed to initialize conversation');
      }
    };

    if (session) {
      setupAssistantThread();
    }
  }, [session, initializeThread]);

  useEffect(() => {
    if (audioService && isAudioInitialized) {
      audioService.onTranscription(async (text) => {
        if (!text) {
          console.log('No transcription text received');
          return;
        }
        
        console.log('Transcription received:', text);
        
        if (!threadId) {
          console.error('No active thread ID found');
          if (currentSlackAccountId) {
            console.log('Attempting to reinitialize thread...');
            try {
              await initializeThread(currentSlackAccountId);
            } catch (error) {
              console.error('Failed to reinitialize thread:', error);
              toast.error('Failed to initialize conversation. Please try again.');
              return;
            }
          } else {
            toast.error('No Slack workspace connected');
            return;
          }
        }

        if (!currentSlackAccountId) {
          console.error('No Slack account ID found');
          toast.error('No Slack workspace connected');
          return;
        }
        
        setIsProcessing(true);
        try {
          console.log('Sending message to thread:', threadId);
          const response = await sendMessage(text);
          console.log('Received response:', response);
          
          if (response) {
            await audioService.textToSpeech(response);
          }
        } catch (error) {
          console.error('Error processing message:', error);
          toast.error('Failed to process your request');
        } finally {
          setIsProcessing(false);
        }
      });
    }
  }, [audioService, isAudioInitialized, threadId, currentSlackAccountId, sendMessage, initializeThread]);

  const handleStartRecording = async () => {
    try {
      if (!threadId && currentSlackAccountId) {
        console.log('No active thread, initializing...');
        await initializeThread(currentSlackAccountId);
      }
      
      await audioService.startRecording();
      setIsListening(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Failed to start recording');
    }
  };

  const handleStopRecording = async () => {
    try {
      await audioService.stopRecording();
      setIsListening(false);
    } catch (error) {
      console.error('Error stopping recording:', error);
      toast.error('Failed to stop recording');
    }
  };

  return (
    <div className="mt-8">
      <div className="flex flex-col items-center justify-center space-y-4">
        <VoiceButton
          onStart={handleStartRecording}
          onStop={handleStopRecording}
          isListening={isListening}
          className="size-16 md:size-20"
        />
        <div className="text-center">
          {isProcessing || isLoading ? (
            <div className="animate-pulse text-muted-foreground">
              Processing your request...
            </div>
          ) : (
            <div className="text-muted-foreground">
              {isAudioInitialized ? 
                (isListening ? "I'm listening... Speak your command" : "Click the microphone to start") : 
                "Initializing audio..."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};