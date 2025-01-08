import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from '@/hooks/use-toast';
import { LoginForm } from '@/components/auth/LoginForm';
import { Header } from '@/components/dashboard/Header';
import { OnboardingSection } from '@/components/dashboard/OnboardingSection';
import { VapiFrame } from '@/components/vapi/VapiFrame';

interface VapiKeys {
  VAPI_API_KEY: string;
  VAPI_ASSISTANT_KEY: string;
}

const Index = () => {
  const [session, setSession] = useState(null);
  const [vapiKeys, setVapiKeys] = useState<VapiKeys | null>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Current session:', session ? 'Active' : 'None');
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log('Auth state changed:', _event);
      setSession(session);
      if (session) {
        toast.success('Successfully logged in!');
        // Fetch Vapi keys when user logs in
        fetchVapiKeys();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchVapiKeys = async () => {
    try {
      const { data: { secrets }, error } = await supabase.functions.invoke('get-vapi-keys');
      if (error) throw error;
      
      if (secrets?.VAPI_API_KEY && secrets?.VAPI_ASSISTANT_KEY) {
        setVapiKeys(secrets);
      } else {
        throw new Error('Missing required Vapi configuration');
      }
    } catch (error) {
      console.error('Error fetching Vapi keys:', error);
      toast({
        title: "Error",
        description: "Failed to initialize voice service",
        variant: "destructive",
      });
    }
  };

  if (!session) {
    return <LoginForm />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <div className="container mx-auto px-4 py-6 md:py-8">
        <Header />
        <OnboardingSection />
        {session && vapiKeys && (
          <VapiFrame 
            apiKey={vapiKeys.VAPI_API_KEY}
            assistantId={vapiKeys.VAPI_ASSISTANT_KEY}
          />
        )}
      </div>
    </div>
  );
};

export default Index;