import { useEffect, useRef } from 'react';
import Vapi from '@vapi-ai/web';
import { toast } from '@/hooks/use-toast';

interface VapiFrameProps {
  apiKey: string;
  assistantId: string;
}

export const VapiFrame = ({ apiKey, assistantId }: VapiFrameProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!containerRef.current || !apiKey || !assistantId) {
      console.warn('Missing required Vapi configuration');
      return;
    }
    
    try {
      const vapi = new Vapi({
        apiKey,
        assistantId,
        element: containerRef.current,
      });

      return () => {
        // Cleanup will be implemented when needed
      };
    } catch (error) {
      console.error('Failed to initialize Vapi:', error);
      toast({
        title: "Error",
        description: "Failed to initialize voice assistant",
        variant: "destructive",
      });
    }
  }, [apiKey, assistantId]);

  if (!apiKey || !assistantId) return null;

  return (
    <div className="fixed bottom-4 right-4 w-96 h-[600px] bg-card rounded-lg shadow-lg overflow-hidden">
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
};