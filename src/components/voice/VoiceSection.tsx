import React, { useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { AudioService } from '@/services/AudioService';
import { ChatStateManager } from '@/services/openai/functionCalling/stateManager';
import { VoiceFrame } from './VoiceFrame';
import { VoiceCommands } from './VoiceCommands';
import { VoiceStateManager } from '@/services/voice/VoiceStateManager';
import { VoiceMessageHandler } from '@/services/voice/VoiceMessageHandler';
import { toast } from 'sonner';

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
  const [voiceState] = useState(() => new VoiceStateManager(new ChatStateManager()));
  const [messageHandler] = useState(() => new VoiceMessageHandler(audioService, voiceState));

  useEffect(() => {
    if (session) {
      voiceState.setupSlackAccount(session.user.id);
    }
  }, [session, voiceState]);

  useEffect(() => {
    if (audioService && isAudioInitialized) {
      audioService.onTranscription(async (text) => {
        setIsProcessing(true);
        try {
          await messageHandler.handleMessage(text);
        } finally {
          setIsProcessing(false);
        }
      });
    }
  }, [audioService, isAudioInitialized, messageHandler]);

  const handleStartRecording = async () => {
    try {
      if (!voiceState.getCurrentSlackAccountId()) {
        toast.error('No Slack workspace connected');
        return;
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
    <div className="space-y-8">
      <VoiceFrame
        onStart={handleStartRecording}
        onStop={handleStopRecording}
        isListening={isListening}
        isProcessing={isProcessing}
        isAudioInitialized={isAudioInitialized}
      />
      <VoiceCommands />
    </div>
  );
};