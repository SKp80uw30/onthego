import React from 'react';
import { VoiceButton } from '@/components/VoiceButton';
import { OnboardingCard } from '@/components/OnboardingCard';
import { Mic } from 'lucide-react';

interface VoiceFrameProps {
  onStart: () => void;
  onStop: () => void;
  isListening: boolean;
  isProcessing: boolean;
  isAudioInitialized: boolean;
}

export const VoiceFrame = ({
  onStart,
  onStop,
  isListening,
  isProcessing,
  isAudioInitialized,
}: VoiceFrameProps) => {
  return (
    <OnboardingCard
      title="Voice Control"
      description="Use voice commands to interact with your Slack channels"
      icon={<Mic className="h-5 w-5 md:h-6 md:w-6 text-primary" />}
      className="mb-6"
    >
      <div className="flex flex-col items-center justify-center space-y-4 py-4">
        <VoiceButton
          onStart={onStart}
          onStop={onStop}
          isListening={isListening}
          className="size-16 md:size-20"
        />
        <div className="text-center">
          {isProcessing ? (
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
    </OnboardingCard>
  );
};