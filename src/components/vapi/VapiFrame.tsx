import { useEffect, useRef, useState } from 'react';
import Vapi from '@vapi-ai/web';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Mic, MicOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface VapiFrameProps {
  apiKey: string;
  assistantId: string;
}

export const VapiFrame = ({ apiKey, assistantId }: VapiFrameProps) => {
  const vapiRef = useRef<Vapi | null>(null);
  const [status, setStatus] = useState<string>('Initializing...');
  const [error, setError] = useState<string | null>(null);
  const [isCallActive, setIsCallActive] = useState(false);
  
  useEffect(() => {
    if (!apiKey || !assistantId) {
      console.error('Missing VAPI configuration:', { apiKey: !!apiKey, assistantId: !!assistantId });
      setStatus('Missing configuration');
      setError('Missing required VAPI configuration');
      return;
    }
    
    const initializeVapi = async () => {
      try {
        console.log('Starting VAPI initialization with:', {
          apiKeyLength: apiKey.length,
          assistantIdLength: assistantId.length
        });
        
        // Initialize VAPI with API key
        vapiRef.current = new Vapi(apiKey);
        
        console.log('VAPI instance created, registering tool...');
        
        // Register tool handler with detailed logging
        vapiRef.current.registerTool('send_slack_message', async (parameters: any) => {
          console.log('Tool handler called with parameters:', {
            handlerInput: parameters,
            type: typeof parameters,
            keys: parameters ? Object.keys(parameters) : 'no parameters'
          });

          try {
            const requestBody = {
              tool: 'send_slack_message',
              parameters
            };
            
            console.log('Sending request to vapi-tools function:', requestBody);
            
            const { data, error } = await supabase.functions.invoke('vapi-tools', {
              body: requestBody
            });

            if (error) {
              console.error('Error from vapi-tools function:', {
                error,
                type: typeof error,
                message: error.message
              });
              throw error;
            }

            console.log('Successful response from vapi-tools:', data);
            return data;
          } catch (error) {
            console.error('Error in send_slack_message tool handler:', {
              error,
              type: typeof error,
              message: error instanceof Error ? error.message : String(error)
            });
            throw error;
          }
        });
        
        console.log('Tool registered, setting up event listeners...');
        
        // Set up event listeners with detailed logging
        vapiRef.current.on('call-start', () => {
          console.log('Event: call-start triggered');
          setStatus('Call in progress');
          setIsCallActive(true);
          setError(null);
        });
        
        vapiRef.current.on('error', (error) => {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error('Event: error triggered:', {
            error,
            type: typeof error,
            message: errorMessage
          });
          setStatus('Error occurred');
          setError(errorMessage);
          setIsCallActive(false);
          toast.error(`Voice assistant error: ${errorMessage}`);
        });

        vapiRef.current.on('speech-start', () => {
          console.log('Event: speech-start triggered');
          setStatus('Assistant speaking');
        });

        vapiRef.current.on('speech-end', () => {
          console.log('Event: speech-end triggered');
          setStatus('Ready');
        });

        vapiRef.current.on('call-end', () => {
          console.log('Event: call-end triggered');
          setStatus('Call ended');
          setIsCallActive(false);
        });

        setStatus('Ready');
        setError(null);
        console.log('VAPI initialization completed successfully');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Failed to initialize VAPI:', {
          error,
          type: typeof error,
          message: errorMessage
        });
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

  const handleToggleCall = async () => {
    if (!vapiRef.current) {
      toast.error('Voice assistant not initialized');
      return;
    }

    try {
      if (isCallActive) {
        console.log('Stopping VAPI call');
        await vapiRef.current.stop();
        setStatus('Call ended');
        setIsCallActive(false);
      } else {
        console.log('Starting VAPI call with assistant:', assistantId);
        await vapiRef.current.start(assistantId);
        // Status will be updated by event listener
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

  return (
    <div className="flex flex-col items-center justify-center space-y-4 p-4">
      <div className="text-lg font-semibold">Voice Assistant Status</div>
      <div className="text-sm text-muted-foreground">{status}</div>
      {error && (
        <div className="text-sm text-red-500 max-w-md text-center">
          Error: {error}
        </div>
      )}
      <Button
        onClick={handleToggleCall}
        variant={isCallActive ? "destructive" : "default"}
        className="mt-4"
      >
        {isCallActive ? (
          <>
            <MicOff className="mr-2 h-4 w-4" />
            Stop Assistant
          </>
        ) : (
          <>
            <Mic className="mr-2 h-4 w-4" />
            Start Assistant
          </>
        )}
      </Button>
    </div>
  );
};