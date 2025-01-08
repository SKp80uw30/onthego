import { useEffect, useRef } from 'react';
import Vapi from '@vapi-ai/web';
import { toast } from 'sonner';

interface VapiFrameProps {
  apiKey: string;
  assistantId: string;
}

export const VapiFrame = ({ apiKey, assistantId }: VapiFrameProps) => {
  const vapiRef = useRef<Vapi | null>(null);
  
  useEffect(() => {
    if (!apiKey || !assistantId) {
      console.warn('Missing required Vapi configuration');
      return;
    }
    
    const initializeVapi = async () => {
      try {
        // Initialize Vapi with the public key
        vapiRef.current = new Vapi(apiKey);
        
        // Start the call with the assistant ID
        await vapiRef.current.start(assistantId);
        
        // Set up event listeners after successful initialization
        vapiRef.current.on('call-start', () => {
          console.log('Call started');
        });
        
        vapiRef.current.on('error', (error) => {
          console.error('Vapi error:', error);
          toast.error('Error with voice assistant');
        });

        vapiRef.current.on('speech-start', () => {
          console.log('Assistant started speaking');
        });

        vapiRef.current.on('speech-end', () => {
          console.log('Assistant finished speaking');
        });

        vapiRef.current.on('call-end', () => {
          console.log('Call ended');
        });
      } catch (error) {
        console.error('Failed to initialize Vapi:', error);
        toast.error('Failed to initialize voice assistant');
      }
    };

    initializeVapi();

    return () => {
      if (vapiRef.current) {
        vapiRef.current.stop();
        vapiRef.current = null;
      }
    };
  }, [apiKey, assistantId]);

  return null;
};