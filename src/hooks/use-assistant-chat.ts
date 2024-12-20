import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useAssistantChat = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);

  const initializeThread = async (slackAccountId: string) => {
    try {
      console.log('Initializing thread for Slack account:', slackAccountId);
      setIsLoading(true);
      
      const { data, error } = await supabase.functions.invoke('assistant-chat', {
        body: {
          action: 'CREATE_THREAD',
          slackAccountId
        }
      });

      if (error) {
        console.error('Error initializing thread:', error);
        toast.error('Failed to start conversation');
        throw error;
      }

      console.log('Thread initialized:', data.threadId);
      setThreadId(data.threadId);
      return data.threadId;
    } catch (error) {
      console.error('Error in initializeThread:', error);
      toast.error('Failed to start conversation');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async (message: string) => {
    if (!threadId) {
      console.error('No active thread');
      toast.error('No active conversation');
      return null;
    }

    try {
      console.log('Sending message to thread:', threadId);
      setIsLoading(true);
      
      const { data, error } = await supabase.functions.invoke('assistant-chat', {
        body: {
          action: 'SEND_MESSAGE',
          threadId,
          message
        }
      });

      if (error) {
        console.error('Error sending message:', error);
        toast.error('Failed to send message');
        throw error;
      }

      console.log('Message sent, response received:', data);
      return data.response;
    } catch (error) {
      console.error('Error in sendMessage:', error);
      toast.error('Failed to send message');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    threadId,
    isLoading,
    initializeThread,
    sendMessage
  };
};