import { useEffect, useRef, useState } from 'react';
import Vapi, { VapiEventNames } from '@vapi-ai/web';
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
        console.log('Initializing VAPI with configuration:', {
          apiKeyLength: apiKey.length,
          assistantIdLength: assistantId.length
        });
        
        // Initialize VAPI with tools configuration
        vapiRef.current = new Vapi({
          apiKey,
          tools: [{
            name: 'send_slack_message',
            handler: async (parameters) => {
              try {
                console.log('Handling send_slack_message tool call:', parameters);
                const { data, error } = await supabase.functions.invoke('vapi-tools', {
                  body: {
                    tool: 'send_slack_message',
                    parameters
                  }
                });

                if (error) {
                  console.error('Error calling vapi-tools function:', error);
                  throw error;
                }

                console.log('VAPI tools response:', data);
                return data;
              } catch (error) {
                console.error('Error in send_slack_message tool handler:', error);
                throw error;
              }
            }
          }]
        });
        
        console.log('VAPI instance created successfully');
        
        // Set up event listeners using correct event names
        vapiRef.current.on(VapiEventNames.CALL_START, () => {
          console.log('VAPI call started');
          setStatus('Call in progress');
          setIsCallActive(true);
          setError(null);
        });
        
        vapiRef.current.on(VapiEventNames.ERROR, (error) => {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error('VAPI error:', errorMessage);
          setStatus('Error occurred');
          setError(errorMessage);
          setIsCallActive(false);
          toast.error(`Voice assistant error: ${errorMessage}`);
        });

        vapiRef.current.on(VapiEventNames.SPEECH_START, () => {
          console.log('VAPI assistant started speaking');
          setStatus('Assistant speaking');
        });

        vapiRef.current.on(VapiEventNames.SPEECH_END, () => {
          console.log('VAPI assistant finished speaking');
          setStatus('Ready');
        });

        vapiRef.current.on(VapiEventNames.CALL_END, () => {
          console.log('VAPI call ended');
          setStatus('Call ended');
          setIsCallActive(false);
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
        console.log('Starting VAPI call');
        await vapiRef.current.start(assistantId);
        // The status will be updated by the call-start event listener
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error toggling VAPI call:', errorMessage);
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