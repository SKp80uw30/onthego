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
  const { initializeThread, sendMessage, isLoading } = useAssistantChat();
  const [currentSlackAccountId, setCurrentSlackAccountId] = useState<string | null>(null);

  useEffect(() => {
    const setupAssistantThread = async () => {
      try {
        // Get the user's default Slack account
        const { data: settings } = await supabase
          .from('settings')
          .select('default_workspace_id')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (settings?.default_workspace_id) {
          setCurrentSlackAccountId(settings.default_workspace_id);
          await initializeThread(settings.default_workspace_id);
        }
      } catch (error) {
        console.error('Error setting up assistant thread:', error);
        toast.error('Failed to initialize conversation');
      }
    };

    if (session) {
      setupAssistantThread();
    }
  }, [session]);

  useEffect(() => {
    if (audioService && isAudioInitialized) {
      audioService.onTranscription(async (text) => {
        if (!text) return;
        
        setIsProcessing(true);
        try {
          const response = await sendMessage(text);
          if (response) {
            await audioService.textToSpeech(response);
          }
        } catch (error) {
          console.error('Error processing message:', error);
        } finally {
          setIsProcessing(false);
        }
      });
    }
  }, [audioService, isAudioInitialized]);

  const handleStartRecording = async () => {
    try {
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