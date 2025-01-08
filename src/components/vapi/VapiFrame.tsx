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
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (!apiKey || !assistantId) {
      console.error('Missing VAPI configuration:', { apiKey: !!apiKey, assistantId: !!assistantId });
      setStatus('Missing configuration');
      setError('Missing required VAPI configuration');
      return;
    }
    
    const initializeVapi = async () => {
      try {
        console.log('Initializing VAPI with configuration:', {
          apiKeyLength: apiKey.length,
          assistantIdLength: assistantId.length
        });
        
        // Initialize Vapi with the public key
        vapiRef.current = new Vapi(apiKey);
        console.log('VAPI instance created successfully');
        
        // Start the call with the assistant ID
        console.log('Attempting to start VAPI with assistant:', assistantId);
        await vapiRef.current.start(assistantId);
        console.log('VAPI started successfully');
        
        // Set up event listeners after successful initialization
        vapiRef.current.on('call-start', () => {
          console.log('VAPI call started');
          setStatus('Call in progress');
          setError(null);
        });
        
        vapiRef.current.on('error', (error) => {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error('VAPI error:', errorMessage);
          setStatus('Error occurred');
          setError(errorMessage);
          toast.error(`Voice assistant error: ${errorMessage}`);
        });

        vapiRef.current.on('speech-start', () => {
          console.log('VAPI assistant started speaking');
          setStatus('Assistant speaking');
        });

        vapiRef.current.on('speech-end', () => {
          console.log('VAPI assistant finished speaking');
          setStatus('Ready');
        });

        vapiRef.current.on('call-end', () => {
          console.log('VAPI call ended');
          setStatus('Call ended');
        });

        setStatus('Ready');
        setError(null);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Failed to initialize VAPI:', errorMessage);
        setStatus('Failed to initialize');
        setError(errorMessage);
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

  return (
    <div className="flex flex-col items-center justify-center space-y-4 p-4">
      <div className="text-lg font-semibold">Voice Assistant Status</div>
      <div className="text-sm text-muted-foreground">{status}</div>
      {error && (
        <div className="text-sm text-red-500 max-w-md text-center">
          Error: {error}
        </div>
      )}
    </div>
  );
};