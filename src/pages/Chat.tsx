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
      console.log('Fetching Vapi keys...');
      const { data: { secrets }, error } = await supabase.functions.invoke('get-vapi-keys');
      
      if (error) {
        console.error('Error fetching Vapi keys:', error);
        toast.error('Failed to initialize voice service');
        throw error;
      }
      
      if (!secrets?.VAPI_PUBLIC_KEY || !secrets?.VAPI_ASSISTANT_KEY) {
        throw new Error('Missing required Vapi configuration');
      }
      
      console.log('Vapi keys fetched successfully');
      return {
        VAPI_PUBLIC_KEY: secrets.VAPI_PUBLIC_KEY,
        VAPI_ASSISTANT_KEY: secrets.VAPI_ASSISTANT_KEY
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
          {isLoading && <div>Loading voice assistant...</div>}
          {error && <div>Error: Failed to load voice assistant</div>}
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