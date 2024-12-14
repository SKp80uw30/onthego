import React, { useState } from 'react';
import { VoiceButton } from '@/components/VoiceButton';
import { OnboardingCard } from '@/components/OnboardingCard';
import { MessageSquare, Mic, Slack } from 'lucide-react';
import { motion } from 'framer-motion';

const Index = () => {
  const [isListening, setIsListening] = useState(false);

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
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4 mb-12"
        >
          <h1 className="text-4xl font-bold tracking-tight">
            On-the-Go AI
          </h1>
          <p className="text-lg text-muted-foreground">
            Manage your Slack messages hands-free with voice commands
          </p>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-12">
          <OnboardingCard
            title="Connect Slack"
            description="Link your Slack workspace to get started"
            icon={<Slack className="h-6 w-6 text-primary" />}
          />
          <OnboardingCard
            title="Voice Commands"
            description="Control your messages with simple voice commands"
            icon={<Mic className="h-6 w-6 text-primary" />}
          />
          <OnboardingCard
            title="Smart Replies"
            description="AI-powered responses for quick communication"
            icon={<MessageSquare className="h-6 w-6 text-primary" />}
          />
        </div>

        <div className="fixed bottom-8 right-8">
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