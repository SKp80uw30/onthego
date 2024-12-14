import React, { useState } from 'react';
import { VoiceButton } from '@/components/VoiceButton';
import { OnboardingCard } from '@/components/OnboardingCard';
import { MessageSquare, Mic, Slack } from 'lucide-react';
import { motion } from 'framer-motion';
import { useIsMobile } from '@/hooks/use-mobile';

const Index = () => {
  const [isListening, setIsListening] = useState(false);
  const isMobile = useIsMobile();

  const handleStartListening = () => {
    setIsListening(true);
    // TODO: Implement voice recognition
  };

  const handleStopListening = () => {
    setIsListening(false);
    // TODO: Stop voice recognition
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <div className="container mx-auto px-4 py-6 md:py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-3 mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            On-the-Go AI
          </h1>
          <p className="text-base md:text-lg text-muted-foreground max-w-md mx-auto">
            Manage your Slack messages hands-free with voice commands
          </p>
        </motion.div>

        <div className="grid gap-4 md:gap-6 mb-8">
          <OnboardingCard
            title="Connect Slack"
            description="Link your Slack workspace to get started"
            icon={<Slack className="h-5 w-5 md:h-6 md:w-6 text-primary" />}
          />
          <OnboardingCard
            title="Voice Commands"
            description="Control your messages with simple voice commands"
            icon={<Mic className="h-5 w-5 md:h-6 md:w-6 text-primary" />}
          />
          <OnboardingCard
            title="Smart Replies"
            description="AI-powered responses for quick communication"
            icon={<MessageSquare className="h-5 w-5 md:h-6 md:w-6 text-primary" />}
          />
        </div>

        <div className={`fixed ${isMobile ? 'bottom-6 right-6' : 'bottom-8 right-8'}`}>
          <VoiceButton
            isListening={isListening}
            onStart={handleStartListening}
            onStop={handleStopListening}
            className="shadow-xl"
          />
        </div>
      </div>
    </div>
  );
};

export default Index;