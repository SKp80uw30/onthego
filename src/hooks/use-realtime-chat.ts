import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { AudioService } from '@/services/AudioService';

export const useRealtimeChat = () => {
  const [audioService, setAudioService] = useState<AudioService | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initializeServices = async () => {
      try {
        const audio = new AudioService();
        await audio.initialize();
        setAudioService(audio);
        setIsInitialized(true);
      } catch (error) {
        console.error('Error initializing services:', error);
        toast.error('Failed to initialize audio services');
      }
    };

    initializeServices();

    return () => {
      if (audioService) {
        audioService.cleanup();
      }
    };
  }, []);

  return { audioService, isInitialized };
};