import { useEffect, useRef } from 'react';
import Vapi from '@vapi-ai/web';

interface VapiFrameProps {
  apiKey: string;
  assistantId: string;
}

export const VapiFrame = ({ apiKey, assistantId }: VapiFrameProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!containerRef.current) return;
    
    const vapi = new Vapi({
      apiKey,
      assistantId,
      element: containerRef.current,
    });

    return () => {
      // Cleanup if needed
    };
  }, [apiKey, assistantId]);

  return (
    <div className="fixed bottom-4 right-4 w-96 h-[600px] bg-card rounded-lg shadow-lg overflow-hidden">
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
};