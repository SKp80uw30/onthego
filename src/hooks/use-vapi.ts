import { useState, useEffect } from 'react';
import { VapiService } from '@/services/VapiService';
import { toast } from 'sonner';

export const useVapi = () => {
  const [vapiService] = useState(() => new VapiService());
  const [isInitialized, setIsInitialized] = useState(false);
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    const initializeVapi = async () => {
      try {
        await vapiService.initialize();
        setIsInitialized(true);
      } catch (error) {
        console.error('Error initializing Vapi:', error);
        toast.error('Failed to initialize voice service');
      }
    };

    initializeVapi();

    return () => {
      vapiService.cleanup();
    };
  }, [vapiService]);

  const startListening = async () => {
    try {
      if (!vapiService.isReady()) {
        throw new Error('Voice service not ready');
      }

      const conversation = await vapiService.startConversation();
      setIsListening(true);
      return conversation;
    } catch (error) {
      console.error('Error starting voice conversation:', error);
      toast.error('Failed to start voice conversation');
      throw error;
    }
  };

  const stopListening = () => {
    setIsListening(false);
  };

  return {
    isInitialized,
    isListening,
    startListening,
    stopListening
  };
};