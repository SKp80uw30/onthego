import React from 'react';
import { VoiceButton } from '@/components/VoiceButton';

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
    <div className="rounded-2xl border border-white/20 bg-white/5 backdrop-blur-sm p-8 flex flex-col items-center justify-center space-y-4">
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
  );
};