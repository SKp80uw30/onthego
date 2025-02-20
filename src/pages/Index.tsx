import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';
import { LoginForm } from '@/components/auth/LoginForm';
import { OnboardingSection } from '@/components/dashboard/OnboardingSection';
import { useSlackData } from '@/hooks/use-slack-data';

const Index = () => {
  const [session, setSession] = useState(null);
  const isMobile = useIsMobile();
  const {
    isLoadingAccounts,
    hasValidSlackAccount,
    workspaceName,
    needsReauth,
  } = useSlackData();

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

  if (!session) {
    return <LoginForm />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <div className="container mx-auto px-4 py-6 md:py-8">
        <OnboardingSection />
      </div>
    </div>
  );
};

export default Index;