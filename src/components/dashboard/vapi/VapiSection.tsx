import React from 'react';
import { motion } from 'framer-motion';
import { OnboardingCard } from '@/components/OnboardingCard';
import { VapiFrame } from '@/components/vapi/VapiFrame';

interface VapiSectionProps {
  vapiKeys?: {
    VAPI_PUBLIC_KEY: string;
    VAPI_ASSISTANT_KEY: string;
  };
  isLoadingVapi?: boolean;
  vapiError?: Error | null;
}

export const VapiSection = ({
  vapiKeys,
  isLoadingVapi,
  vapiError,
}: VapiSectionProps) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4 }}
      className="mb-4"
    >
      <OnboardingCard
        title=""
        description=""
        content={
          isLoadingVapi ? (
            <div className="text-center p-8">
              <h3 className="text-lg font-semibold mb-2">Loading Voice Assistant...</h3>
            </div>
          ) : vapiError ? (
            <div className="text-center p-8">
              <h3 className="text-lg font-semibold mb-2">Voice Assistant Error</h3>
              <p className="text-muted-foreground">{vapiError.message}</p>
            </div>
          ) : vapiKeys ? (
            <VapiFrame 
              apiKey={vapiKeys.VAPI_PUBLIC_KEY}
              assistantId={vapiKeys.VAPI_ASSISTANT_KEY}
            />
          ) : (
            <div className="text-center p-8">
              <h3 className="text-lg font-semibold mb-2">Voice Assistant</h3>
              <p className="text-muted-foreground">
                Failed to load VAPI configuration
              </p>
            </div>
          )
        }
      />
    </motion.div>
  );
};