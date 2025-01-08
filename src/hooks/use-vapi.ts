import { useState, useEffect } from 'react';
import { VapiService } from '@/services/VapiService';
import { toast } from 'sonner';
import type VapiConversation from '@vapi-ai/web';

export const useVapi = () => {
  const [vapiService] = useState(() => new VapiService());
  const [isInitialized, setIsInitialized] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [currentConversation, setCurrentConversation] = useState<VapiConversation | null>(null);

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
      if (currentConversation) {
        currentConversation.stop();
      }
      vapiService.cleanup();
    };
  }, [vapiService]);

  const startListening = async () => {
    try {
      if (!vapiService.isReady()) {
        throw new Error('Voice service not ready');
      }

      const conversation = await vapiService.startConversation();
      setCurrentConversation(conversation);
      setIsListening(true);
      return conversation;
    } catch (error) {
      console.error('Error starting voice conversation:', error);
      toast.error('Failed to start voice conversation');
      throw error;
    }
  };

  const stopListening = () => {
    if (currentConversation) {
      currentConversation.stop();
      setCurrentConversation(null);
    }
    setIsListening(false);
  };

  return {
    isInitialized,
    isListening,
    startListening,
    stopListening
  };
};