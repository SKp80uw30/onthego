import { useEffect, useRef, useState } from 'react';
import Vapi from '@vapi-ai/web';
import { toast } from 'sonner';

interface VapiFrameProps {
  apiKey: string;
  assistantId: string;
}

export const VapiFrame = ({ apiKey, assistantId }: VapiFrameProps) => {
  const vapiRef = useRef<Vapi | null>(null);
  const [status, setStatus] = useState<string>('Initializing...');
  
  useEffect(() => {
    if (!apiKey || !assistantId) {
      console.warn('Missing required Vapi configuration');
      setStatus('Missing configuration');
      return;
    }
    
    const initializeVapi = async () => {
      try {
        console.log('Initializing Vapi with key:', apiKey);
        // Initialize Vapi with the public key
        vapiRef.current = new Vapi(apiKey);
        
        // Start the call with the assistant ID
        console.log('Starting Vapi with assistant:', assistantId);
        await vapiRef.current.start(assistantId);
        
        // Set up event listeners after successful initialization
        vapiRef.current.on('call-start', () => {
          console.log('Call started');
          setStatus('Call in progress');
        });
        
        vapiRef.current.on('error', (error) => {
          console.error('Vapi error:', error);
          setStatus('Error occurred');
          toast.error('Error with voice assistant');
        });

        vapiRef.current.on('speech-start', () => {
          console.log('Assistant started speaking');
          setStatus('Assistant speaking');
        });

        vapiRef.current.on('speech-end', () => {
          console.log('Assistant finished speaking');
          setStatus('Ready');
        });

        vapiRef.current.on('call-end', () => {
          console.log('Call ended');
          setStatus('Call ended');
        });

        setStatus('Ready');
      } catch (error) {
        console.error('Failed to initialize Vapi:', error);
        setStatus('Failed to initialize');
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

  return (
    <div className="flex flex-col items-center justify-center space-y-4 p-4">
      <div className="text-lg font-semibold">Voice Assistant Status</div>
      <div className="text-sm text-muted-foreground">{status}</div>
    </div>
  );
};