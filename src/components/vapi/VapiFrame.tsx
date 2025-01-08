import { useEffect, useRef } from 'react';
import { VapiWeb } from '@vapi-ai/web';
import { toast } from 'sonner';

interface VapiFrameProps {
  apiKey: string;
  assistantId: string;
}

export const VapiFrame = ({ apiKey, assistantId }: VapiFrameProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const vapiInstanceRef = useRef<VapiWeb | null>(null);
  
  useEffect(() => {
    if (!containerRef.current || !apiKey || !assistantId) {
      console.warn('Missing required Vapi configuration');
      return;
    }
    
    try {
      vapiInstanceRef.current = new VapiWeb({
        apiKey,
        assistantId,
        element: containerRef.current,
      });

      return () => {
        if (vapiInstanceRef.current) {
          // Clean up VAPI instance if needed in the future
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
    <div className="fixed bottom-4 right-4 w-96 h-[600px] bg-card rounded-lg shadow-lg overflow-hidden">
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
};