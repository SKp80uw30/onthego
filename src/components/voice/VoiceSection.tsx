import React, { useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { AudioService } from '@/services/AudioService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { VoiceButton } from '@/components/VoiceButton';
import { ChatStateManager } from '@/services/openai/functionCalling/stateManager';
import { ChatMessage, SlackMessageArgs, FetchMessagesArgs, FetchMentionsArgs } from '@/services/openai/functionCalling/types';

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
        console.log('Setting up Slack account for user:', session.user.id);
        
        // Get the user's default Slack account
        const { data: settings, error: settingsError } = await supabase
          .from('settings')
          .select('default_workspace_id')
          .eq('user_id', session.user.id)
          .limit(1)
          .maybeSingle();

        if (settingsError) {
          console.error('Error fetching settings:', settingsError);
          toast.error('Failed to fetch workspace settings');
          return;
        }

        if (!settings?.default_workspace_id) {
          console.log('No default workspace found, fetching first available workspace');
          const { data: accounts, error: accountsError } = await supabase
            .from('slack_accounts')
            .select('id')
            .eq('user_id', session.user.id)
            .limit(1)
            .maybeSingle();

          if (accountsError) {
            console.error('Error fetching Slack accounts:', accountsError);
            toast.error('Failed to fetch Slack workspaces');
            return;
          }

          if (accounts?.id) {
            console.log('Using workspace:', accounts.id);
            setCurrentSlackAccountId(accounts.id);
            chatState.setSlackAccountId(accounts.id);
          } else {
            console.warn('No Slack workspaces found');
            toast.error('No Slack workspace connected');
          }
        } else {
          console.log('Using default workspace:', settings.default_workspace_id);
          setCurrentSlackAccountId(settings.default_workspace_id);
          chatState.setSlackAccountId(settings.default_workspace_id);
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

  const handleFunctionCall = async (functionCall: any) => {
    try {
      const args = JSON.parse(functionCall.arguments);
      
      switch (functionCall.name) {
        case 'send_message': {
          const { channelName, message } = args as SlackMessageArgs;
          const response = await supabase.functions.invoke('slack-operations', {
            body: { action: 'SEND_MESSAGE', channelName, message, slackAccountId: currentSlackAccountId }
          });
          return response.data?.message || 'Message sent successfully';
        }
        case 'fetch_messages': {
          const { channelName, count } = args as FetchMessagesArgs;
          const response = await supabase.functions.invoke('slack-operations', {
            body: { action: 'FETCH_MESSAGES', channelName, count, slackAccountId: currentSlackAccountId }
          });
          return response.data?.messages?.join('\n') || 'No messages found';
        }
        case 'fetch_mentions': {
          const { channelName, count } = args as FetchMentionsArgs;
          const response = await supabase.functions.invoke('slack-operations', {
            body: { action: 'FETCH_MENTIONS', channelName, count, slackAccountId: currentSlackAccountId }
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

  useEffect(() => {
    if (audioService && isAudioInitialized) {
      audioService.onTranscription(async (text) => {
        if (!text) {
          console.log('No transcription text received');
          return;
        }
        
        console.log('Transcription received:', text);
        
        if (!currentSlackAccountId) {
          console.error('No Slack account ID found');
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
            
            // Get final response from assistant
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
    <div className="mt-8">
      <div className="flex flex-col items-center justify-center space-y-4">
        <VoiceButton
          onStart={handleStartRecording}
          onStop={handleStopRecording}
          isListening={isListening}
          className="size-16 md:size-20"
        />
        <div className="text-center">
          {isProcessing ? (
            <div className="animate-pulse text-muted-foreground">
              Processing your request...
            </div>
          ) : (
            <div className="text-muted-foreground">
              {isAudioInitialized ? 
                (isListening ? "I'm listening... Speak your command" : "Click the microphone to start") : 
                "Initializing audio..."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};