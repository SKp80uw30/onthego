import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VapiFrame } from '@/components/vapi/VapiFrame';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const Chat = () => {
  const { data: vapiKeys, isLoading, error } = useQuery({
    queryKey: ['vapi-keys'],
    queryFn: async () => {
      console.log('Fetching VAPI keys from Edge Function...');
      const { data, error } = await supabase.functions.invoke('get-vapi-keys');
      
      if (error) {
        console.error('Error fetching VAPI keys:', error);
        toast.error('Failed to initialize voice service');
        throw error;
      }
      
      if (!data?.secrets?.VAPI_PUBLIC_KEY || !data?.secrets?.VAPI_ASSISTANT_KEY) {
        console.error('Missing required VAPI configuration in response:', data);
        throw new Error('Missing required VAPI configuration');
      }
      
      console.log('VAPI keys fetched successfully');
      return {
        VAPI_PUBLIC_KEY: data.secrets.VAPI_PUBLIC_KEY,
        VAPI_ASSISTANT_KEY: data.secrets.VAPI_ASSISTANT_KEY
      };
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <div className="container mx-auto px-4 py-6">
        <div className="mb-8">
          <Link to="/">
            <Button variant="ghost" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Onboarding
            </Button>
          </Link>
        </div>
        
        <div className="flex flex-col justify-center items-center min-h-[calc(100vh-200px)]">
          {isLoading && (
            <div className="text-lg">Loading voice assistant...</div>
          )}
          {error && (
            <div className="text-red-500 max-w-md text-center">
              <div className="font-semibold mb-2">Error: Failed to load voice assistant</div>
              <div className="text-sm">{error instanceof Error ? error.message : String(error)}</div>
            </div>
          )}
          {vapiKeys && (
            <VapiFrame 
              apiKey={vapiKeys.VAPI_PUBLIC_KEY}
              assistantId={vapiKeys.VAPI_ASSISTANT_KEY}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Chat;