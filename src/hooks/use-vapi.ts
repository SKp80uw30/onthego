import { useState, useEffect } from 'react';
import { VapiService } from '@/services/VapiService';
import { toast } from 'sonner';
import Vapi from '@vapi-ai/web';

export const useVapi = () => {
  const [vapiService] = useState(() => new VapiService());
  const [isInitialized, setIsInitialized] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [currentCall, setCurrentCall] = useState<Awaited<ReturnType<Vapi['createWebCall']>> | null>(null);

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
      if (currentCall) {
        currentCall.stop();
      }
      vapiService.cleanup();
    };
  }, [vapiService]);

  const startListening = async () => {
    try {
      if (!vapiService.isReady()) {
        throw new Error('Voice service not ready');
      }

      const call = await vapiService.startConversation();
      await call.start();
      setCurrentCall(call);
      setIsListening(true);
      return call;
    } catch (error) {
      console.error('Error starting voice conversation:', error);
      toast.error('Failed to start voice conversation');
      throw error;
    }
  };

  const stopListening = () => {
    if (currentCall) {
      currentCall.stop();
      setCurrentCall(null);
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