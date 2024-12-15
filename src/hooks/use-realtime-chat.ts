import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from "@/integrations/supabase/client";

class WebSocketManager {
  private socket: WebSocket | null = null;
  private maxRetries = 3;
  private retryDelay = 2000;
  private currentRetry = 0;
  private url: string;
  private token: string;

  constructor(url: string, token: string) {
    this.url = url;
    this.token = token;
  }

  connect(onOpen: () => void, onMessage: (data: any) => void, onError: (error: any) => void, onClose: () => void) {
    console.log('Initializing WebSocket connection...');
    
    try {
      this.socket = new WebSocket(`${this.url}?token=${this.token}`);

      this.socket.onopen = () => {
        console.log('WebSocket connection established');
        this.currentRetry = 0;
        onOpen();
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessage(data);
        } catch (error) {
          console.error('Error processing message:', error);
        }
      };

      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        onError(error);
        this.reconnect(onOpen, onMessage, onError, onClose);
      };

      this.socket.onclose = () => {
        console.log('WebSocket closed');
        onClose();
        this.reconnect(onOpen, onMessage, onError, onClose);
      };
    } catch (error) {
      console.error('Error creating WebSocket:', error);
      this.reconnect(onOpen, onMessage, onError, onClose);
    }
  }

  private reconnect(onOpen: () => void, onMessage: (data: any) => void, onError: (error: any) => void, onClose: () => void) {
    if (this.currentRetry < this.maxRetries) {
      this.currentRetry++;
      const delay = this.retryDelay * Math.pow(2, this.currentRetry - 1);
      console.log(`Retrying connection (${this.currentRetry}/${this.maxRetries}) in ${delay}ms...`);
      
      setTimeout(() => {
        this.connect(onOpen, onMessage, onError, onClose);
      }, delay);
    } else {
      console.error('Max reconnection attempts reached');
      toast.error('Connection failed after multiple attempts');
    }
  }

  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  send(data: any) {
    if (this.isConnected()) {
      this.socket!.send(JSON.stringify(data));
    } else {
      console.error('WebSocket is not connected');
      toast.error('Connection not ready. Please try again.');
    }
  }

  close() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
}

export const useRealtimeChat = () => {
  const [wsManager, setWsManager] = useState<WebSocketManager | null>(null);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const initializeWebSocket = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        console.error('No authentication token available');
        toast.error('Authentication required');
        return;
      }

      const manager = new WebSocketManager(
        'wss://slomrtdygughdpenilco.functions.supabase.co/functions/v1/realtime-chat',
        session.access_token
      );

      manager.connect(
        // onOpen
        async () => {
          setIsConnected(true);
          try {
            const context = new AudioContext({ sampleRate: 24000 });
            await context.resume();
            setAudioContext(context);
          } catch (error) {
            console.error('Error creating AudioContext:', error);
            toast.error('Error initializing audio system');
          }
        },
        // onMessage
        async (data) => {
          console.log('Received message:', data);
          if (data.type === 'response.audio.delta' && audioContext?.state === 'running') {
            try {
              const audioData = atob(data.delta);
              const audioArray = new Uint8Array(audioData.length);
              for (let i = 0; i < audioData.length; i++) {
                audioArray[i] = audioData.charCodeAt(i);
              }
              
              const audioBuffer = await audioContext.decodeAudioData(audioArray.buffer);
              const source = audioContext.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(audioContext.destination);
              source.start();
            } catch (error) {
              console.error('Error playing audio:', error);
            }
          }
        },
        // onError
        (error) => {
          console.error('WebSocket error:', error);
          setIsConnected(false);
        },
        // onClose
        () => {
          setIsConnected(false);
        }
      );

      setWsManager(manager);
    } catch (error) {
      console.error('Error initializing WebSocket:', error);
      toast.error('Failed to initialize connection');
    }
  }, []);

  useEffect(() => {
    initializeWebSocket();

    return () => {
      if (wsManager) {
        wsManager.close();
      }
      if (audioContext) {
        audioContext.close();
      }
    };
  }, [initializeWebSocket]);

  return { wsManager, audioContext, isConnected };
};