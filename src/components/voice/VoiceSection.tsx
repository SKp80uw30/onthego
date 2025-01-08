import React from 'react';
import { Session } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { VoiceButton } from '@/components/VoiceButton';
import { useVapi } from '@/hooks/use-vapi';

interface VoiceSectionProps {
  session: Session;
}

export const VoiceSection: React.FC<VoiceSectionProps> = ({
  session
}) => {
  const {
    isInitialized,
    isListening,
    startListening,
    stopListening
  } = useVapi();

  const handleStartRecording = async () => {
    try {
      await startListening();
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Failed to start recording');
    }
  };

  const handleStopRecording = async () => {
    try {
      stopListening();
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
          <div className="text-muted-foreground">
            {isInitialized ? 
              (isListening ? "I'm listening... Speak your command" : "Click the microphone to start") : 
              "Initializing voice service..."}
          </div>
        </div>
      </div>
    </div>
  );
};