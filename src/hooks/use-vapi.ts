import { useEffect, useRef, useState } from 'react';
import Vapi from '@vapi-ai/web';
import { toast } from 'sonner';
import { VapiState } from '@/types/vapi';
import { createVapiEventHandlers } from './vapi/vapi-event-handlers';

const INITIAL_STATE: VapiState = {
  status: 'Initializing...',
  error: null,
  isCallActive: false
};

export const useVapi = (apiKey: string, assistantId: string) => {
  const vapiRef = useRef<Vapi | null>(null);
  const [state, setState] = useState<VapiState>(INITIAL_STATE);

  const updateState = (updates: Partial<VapiState>) => {
    setState(current => ({ ...current, ...updates }));
  };

  useEffect(() => {
    if (!apiKey || !assistantId) {
      console.error('Missing VAPI configuration:', { apiKey: !!apiKey, assistantId: !!assistantId });
      updateState({
        status: 'Missing configuration',
        error: 'Missing required VAPI configuration'
      });
      return;
    }
    
    const initializeVapi = async () => {
      try {
        console.log('Starting VAPI initialization with:', {
          apiKeyLength: apiKey.length,
          assistantIdLength: assistantId.length
        });
        
        vapiRef.current = new Vapi(apiKey);
        
        const handlers = createVapiEventHandlers(updateState);
        
        vapiRef.current.on('call-start', handlers.handleCallStart);
        vapiRef.current.on('error', handlers.handleError);
        vapiRef.current.on('speech-start', handlers.handleSpeechStart);
        vapiRef.current.on('speech-end', handlers.handleSpeechEnd);
        vapiRef.current.on('call-end', handlers.handleCallEnd);

        updateState({
          status: 'Ready',
          error: null
        });
        console.log('VAPI initialization completed successfully');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Failed to initialize VAPI:', {
          error,
          type: typeof error,
          message: errorMessage
        });
        updateState({
          status: 'Failed to initialize',
          error: errorMessage
        });
        toast.error(`Failed to initialize voice assistant: ${errorMessage}`);
      }
    };

    initializeVapi();

    return () => {
      if (vapiRef.current) {
        console.log('Cleaning up VAPI instance');
        vapiRef.current.stop();
        vapiRef.current = null;
      }
    };
  }, [apiKey, assistantId]);

  const toggleCall = async () => {
    if (!vapiRef.current) {
      toast.error('Voice assistant not initialized');
      return;
    }

    try {
      if (state.isCallActive) {
        console.log('Stopping VAPI call');
        await vapiRef.current.stop();
        updateState({
          status: 'Call ended',
          isCallActive: false
        });
      } else {
        console.log('Starting VAPI call with assistant:', assistantId);
        await vapiRef.current.start(assistantId);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error toggling VAPI call:', {
        error,
        type: typeof error,
        message: errorMessage
      });
      toast.error(`Error controlling voice assistant: ${errorMessage}`);
    }
  };

  return {
    ...state,
    toggleCall
  };
};