import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';
import { LoginForm } from '@/components/auth/LoginForm';
import { Header } from '@/components/dashboard/Header';
import { OnboardingSection } from '@/components/dashboard/OnboardingSection';
import VapiWidget from '@vapi-ai/web';

const Index = () => {
  const [session, setSession] = useState(null);
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
      return secrets;
    } catch (error) {
      console.error('Error fetching Vapi keys:', error);
      toast.error('Failed to initialize voice service');
      return null;
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
        {session && (
          <div className="mt-8 flex justify-center">
            <div className="w-full max-w-xl">
              <VapiWidget
                apiKey={async () => {
                  const secrets = await fetchVapiKeys();
                  return secrets?.VAPI_API_KEY || '';
                }}
                assistantId={async () => {
                  const secrets = await fetchVapiKeys();
                  return secrets?.VAPI_ASSISTANT_KEY || '';
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;