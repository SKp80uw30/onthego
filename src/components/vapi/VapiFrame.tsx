import { useEffect, useRef } from 'react';
import Vapi from '@vapi-ai/web';
import { toast } from 'sonner';

interface VapiFrameProps {
  apiKey: string;
  assistantId: string;
}

export const VapiFrame = ({ apiKey, assistantId }: VapiFrameProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const vapiInstanceRef = useRef<any>(null);
  
  useEffect(() => {
    if (!containerRef.current || !apiKey || !assistantId) {
      console.warn('Missing required Vapi configuration');
      return;
    }
    
    try {
      vapiInstanceRef.current = new Vapi(apiKey, assistantId);
      
      // Mount Vapi to the container
      vapiInstanceRef.current.mount(containerRef.current, {
        audio: {
          enable: true,
        },
        style: {
          position: 'fixed',
          bottom: '1rem',
          right: '1rem',
          width: '24rem',
          height: '600px',
        }
      });

      return () => {
        if (vapiInstanceRef.current) {
          vapiInstanceRef.current.unmount();
          vapiInstanceRef.current = null;
        }
      };
    } catch (error) {
      console.error('Failed to initialize Vapi:', error);
      toast.error('Failed to initialize voice assistant');
    }
  }, [apiKey, assistantId]);

  if (!apiKey || !assistantId) return null;

  return (
    <div ref={containerRef} className="w-full h-full" />
  );
};