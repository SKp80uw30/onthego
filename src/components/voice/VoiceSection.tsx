import React from 'react';
import { VoiceButton } from '@/components/VoiceButton';
import { AudioService } from '@/services/AudioService';
import { toast } from 'sonner';

interface VoiceSectionProps {
  session: any;
  audioService: AudioService;
  isAudioInitialized: boolean;
}

export const VoiceSection = ({ session, audioService, isAudioInitialized }: VoiceSectionProps) => {
  const [isListening, setIsListening] = React.useState(false);

  const handleStartListening = async () => {
    if (!session) {
      toast.error('Please log in to use this feature');
      return;
    }

    if (!isAudioInitialized) {
      toast.error('Audio service is still initializing. Please try again in a moment.');
      return;
    }

    try {
      await audioService.startRecording();
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

  return (
    <div className="flex justify-center mt-8">
      <VoiceButton
        isListening={isListening}
        onStart={handleStartListening}
        onStop={handleStopListening}
        className="shadow-xl"
      />
    </div>
  );
};