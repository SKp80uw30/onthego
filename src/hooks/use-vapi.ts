import { useEffect, useRef, useState } from 'react';
import Vapi from '@vapi-ai/web';
import { toast } from 'sonner';
import { createToolHandler } from '@/components/vapi/VapiToolHandler';

interface VapiState {
  status: string;
  error: string | null;
  isCallActive: boolean;
}

export const useVapi = (apiKey: string, assistantId: string) => {
  const vapiRef = useRef<Vapi | null>(null);
  const [state, setState] = useState<VapiState>({
    status: 'Initializing...',
    error: null,
    isCallActive: false
  });

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
        
        console.log('VAPI instance created, registering tool...');
        
        const toolHandler = createToolHandler();
        vapiRef.current.addTool('Send_slack_message', toolHandler);
        
        console.log('Tool registered, setting up event listeners...');
        
        vapiRef.current.on('call-start', () => {
          console.log('Event: call-start triggered');
          updateState({
            status: 'Call in progress',
            isCallActive: true,
            error: null
          });
        });
        
        vapiRef.current.on('error', (error) => {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error('Event: error triggered:', {
            error,
            type: typeof error,
            message: errorMessage
          });
          updateState({
            status: 'Error occurred',
            error: errorMessage,
            isCallActive: false
          });
          toast.error(`Voice assistant error: ${errorMessage}`);
        });

        vapiRef.current.on('speech-start', () => {
          console.log('Event: speech-start triggered');
          updateState({ status: 'Assistant speaking' });
        });

        vapiRef.current.on('speech-end', () => {
          console.log('Event: speech-end triggered');
          updateState({ status: 'Ready' });
        });

        vapiRef.current.on('call-end', () => {
          console.log('Event: call-end triggered');
          updateState({
            status: 'Call ended',
            isCallActive: false
          });
        });

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