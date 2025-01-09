import { useCallback, useEffect, useState } from 'react';
import { VapiClient } from '@vapi-ai/web';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useVapi = (apiKey: string, assistantKey: string) => {
  const [client, setClient] = useState<VapiClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!apiKey || !assistantKey) {
      setError('API key and Assistant key are required');
      return;
    }

    const vapiClient = new VapiClient({
      apiKey: apiKey,
    });

    setClient(vapiClient);
  }, [apiKey, assistantKey]);

  const handleToolExecution = useCallback(async (toolCall: any) => {
    try {
      console.log('Executing tool:', toolCall);
      
      const { data: response, error } = await supabase.functions.invoke('vapi-tools', {
        body: { message: { toolCalls: [toolCall] } }
      });

      if (error) {
        console.error('Tool execution error:', error);
        toast.error('Failed to execute tool');
        return null;
      }

      console.log('Tool execution response:', response);
      return response;
    } catch (err) {
      console.error('Tool execution error:', err);
      toast.error('Failed to execute tool');
      return null;
    }
  }, []);

  const connect = useCallback(async () => {
    if (!client) {
      setError('Client not initialized');
      return;
    }

    try {
      const call = await client.start({
        assistantId: assistantKey,
        onError: (error) => {
          console.error('VAPI error:', error);
          setError(error.message);
          toast.error('Connection error: ' + error.message);
        },
        onConnect: () => {
          console.log('Connected to VAPI');
          setIsConnected(true);
          toast.success('Connected to assistant');
        },
        onDisconnect: () => {
          console.log('Disconnected from VAPI');
          setIsConnected(false);
        },
        tools: [
          {
            name: 'Send_slack_message',
            description: 'Send a message to a Slack channel',
            parameters: {
              type: 'object',
              properties: {
                Channel_name: {
                  type: 'string',
                  description: 'The name of the Slack channel to send the message to',
                },
                Channel_message: {
                  type: 'string',
                  description: 'The message to send to the Slack channel',
                },
                Send_message_approval: {
                  type: 'boolean',
                  description: 'Approval to send the message',
                },
              },
              required: ['Channel_name', 'Channel_message', 'Send_message_approval'],
            },
          },
        ],
        onToolCall: handleToolExecution,
      });

      return call;
    } catch (err) {
      console.error('Failed to connect:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect');
      return null;
    }
  }, [client, assistantKey, handleToolExecution]);

  return {
    client,
    connect,
    isConnected,
    error,
  };
};