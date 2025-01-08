import React from 'react';
import { MessageSquare, ArrowUp, ArrowDown, Edit } from 'lucide-react';
import { OnboardingCard } from '@/components/OnboardingCard';

export const VoiceCommands = () => {
  return (
    <OnboardingCard
      title="Available Voice Commands"
      description="Quick guide for voice interactions"
      icon={<MessageSquare className="h-5 w-5 md:h-6 md:w-6 text-primary" />}
      className="mt-8"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        <div className="flex items-start space-x-2">
          <ArrowUp className="h-5 w-5 text-primary mt-1" />
          <div>
            <h4 className="text-sm font-medium">Send Messages</h4>
            <p className="text-xs text-muted-foreground">
              "Send message to [channel]"
            </p>
          </div>
        </div>
        <div className="flex items-start space-x-2">
          <ArrowDown className="h-5 w-5 text-primary mt-1" />
          <div>
            <h4 className="text-sm font-medium">Fetch Messages</h4>
            <p className="text-xs text-muted-foreground">
              "Get messages from [channel]"
            </p>
          </div>
        </div>
        <div className="flex items-start space-x-2">
          <Edit className="h-5 w-5 text-primary mt-1" />
          <div>
            <h4 className="text-sm font-medium">Write Messages</h4>
            <p className="text-xs text-muted-foreground">
              "Write '[message]' to [channel]"
            </p>
          </div>
        </div>
      </div>
    </OnboardingCard>
  );
};