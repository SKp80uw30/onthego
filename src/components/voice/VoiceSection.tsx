import React, { useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { AudioService } from '@/services/AudioService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ChatStateManager } from '@/services/openai/functionCalling/stateManager';
import { VoiceFrame } from './VoiceFrame';
import { VoiceCommands } from './VoiceCommands';

interface VoiceSectionProps {
  session: Session;
  audioService: AudioService;
  isAudioInitialized: boolean;
}

export const VoiceSection: React.FC<VoiceSectionProps> = ({
  session,
  audioService,
  isAudioInitialized
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [chatState] = useState(() => new ChatStateManager());
  const [currentSlackAccountId, setCurrentSlackAccountId] = useState<string | null>(null);

  useEffect(() => {
    const setupSlackAccount = async () => {
      try {
        const { data: settings, error: settingsError } = await supabase
          .from('settings')
          .select('default_workspace_id')
          .eq('user_id', session.user.id)
          .limit(1)
          .maybeSingle();

        if (settingsError) throw settingsError;

        const workspaceId = settings?.default_workspace_id;
        
        if (!workspaceId) {
          const { data: accounts, error: accountsError } = await supabase
            .from('slack_accounts')
            .select('id')
            .eq('user_id', session.user.id)
            .limit(1)
            .maybeSingle();

          if (accountsError) throw accountsError;
          
          if (accounts?.id) {
            setCurrentSlackAccountId(accounts.id);
            chatState.setSlackAccountId(accounts.id);
          } else {
            toast.error('No Slack workspace connected');
          }
        } else {
          setCurrentSlackAccountId(workspaceId);
          chatState.setSlackAccountId(workspaceId);
        }
      } catch (error) {
        console.error('Error in setupSlackAccount:', error);
        toast.error('Failed to initialize workspace');
      }
    };

    if (session) {
      setupSlackAccount();
    }
  }, [session, chatState]);

  useEffect(() => {
    if (audioService && isAudioInitialized) {
      audioService.onTranscription(async (text) => {
        if (!text) return;
        
        if (!currentSlackAccountId) {
          toast.error('No Slack workspace connected');
          return;
        }
        
        setIsProcessing(true);
        try {
          const { data: response, error } = await supabase.functions.invoke('openai-chat', {
            body: {
              message: text,
              conversationHistory: chatState.getConversationHistory()
            }
          });

          if (error) throw error;

          chatState.addMessage({ role: 'user', content: text });
          
          if (response.function_call) {
            const functionResult = await handleFunctionCall(response.function_call);
            chatState.addMessage({
              role: 'function',
              name: response.function_call.name,
              content: functionResult
            });
            
            const { data: finalResponse, error: finalError } = await supabase.functions.invoke('openai-chat', {
              body: {
                message: functionResult,
                conversationHistory: chatState.getConversationHistory()
              }
            });

            if (finalError) throw finalError;
            
            if (finalResponse.content) {
              await audioService.textToSpeech(finalResponse.content);
            }
          } else if (response.content) {
            await audioService.textToSpeech(response.content);
          }
          
          chatState.addMessage(response);
        } catch (error) {
          console.error('Error processing message:', error);
          toast.error('Failed to process your request');
        } finally {
          setIsProcessing(false);
        }
      });
    }
  }, [audioService, isAudioInitialized, currentSlackAccountId, chatState]);

  const handleStartRecording = async () => {
    try {
      if (!currentSlackAccountId) {
        toast.error('No Slack workspace connected');
        return;
      }
      
      await audioService.startRecording();
      setIsListening(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Failed to start recording');
    }
  };

  const handleStopRecording = async () => {
    try {
      await audioService.stopRecording();
      setIsListening(false);
    } catch (error) {
      console.error('Error stopping recording:', error);
      toast.error('Failed to stop recording');
    }
  };

  return (
    <div className="mt-8 space-y-8">
      <VoiceFrame
        onStart={handleStartRecording}
        onStop={handleStopRecording}
        isListening={isListening}
        isProcessing={isProcessing}
        isAudioInitialized={isAudioInitialized}
      />
      <VoiceCommands />
    </div>
  );
};

// Helper function moved to the same file since it's only used here
const handleFunctionCall = async (functionCall: any) => {
  try {
    const args = JSON.parse(functionCall.arguments);
    
    switch (functionCall.name) {
      case 'send_message': {
        const { channelName, message } = args;
        const response = await supabase.functions.invoke('slack-operations', {
          body: { action: 'SEND_MESSAGE', channelName, message }
        });
        return response.data?.message || 'Message sent successfully';
      }
      case 'fetch_messages': {
        const { channelName, count } = args;
        const response = await supabase.functions.invoke('slack-operations', {
          body: { action: 'FETCH_MESSAGES', channelName, count }
        });
        return response.data?.messages?.join('\n') || 'No messages found';
      }
      case 'fetch_mentions': {
        const { channelName, count } = args;
        const response = await supabase.functions.invoke('slack-operations', {
          body: { action: 'FETCH_MENTIONS', channelName, count }
        });
        return response.data?.messages?.join('\n') || 'No mentions found';
      }
      default:
        throw new Error(`Unknown function: ${functionCall.name}`);
    }
  } catch (error) {
    console.error('Error executing function:', error);
    throw error;
  }
};