import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from "@/integrations/supabase/client";
import { WebSocketService } from '@/services/WebSocketService';
import { AudioService } from '@/services/AudioService';
import { encodeAudioForAPI } from '@/utils/audio';

export const useRealtimeChat = () => {
  const [wsService, setWsService] = useState<WebSocketService | null>(null);
  const [audioService, setAudioService] = useState<AudioService | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const initializeServices = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        console.error('No authentication token available');
        toast.error('Authentication required');
        return;
      }

      const ws = new WebSocketService(
        'wss://slomrtdygughdpenilco.functions.supabase.co/functions/v1/realtime-chat',
        session.access_token
      );

      const audio = new AudioService((audioData: Float32Array) => {
        if (ws.isConnected()) {
          const encodedAudio = encodeAudioForAPI(audioData);
          ws.send({
            type: 'input_audio_buffer.append',
            audio: encodedAudio
          });
        }
      });

      await ws.connect();
      await audio.initialize();

      ws.onMessage((data) => {
        if (data.type === 'response.audio.delta') {
          try {
            const audioData = atob(data.delta);
            const audioArray = new Uint8Array(audioData.length);
            for (let i = 0; i < audioData.length; i++) {
              audioArray[i] = audioData.charCodeAt(i);
            }
            audio.playAudio(audioArray);
          } catch (error) {
            console.error('Error playing audio:', error);
          }
        }
      });

      setWsService(ws);
      setAudioService(audio);
      setIsConnected(true);
    } catch (error) {
      console.error('Error initializing services:', error);
      toast.error('Failed to initialize connection');
    }
  }, []);

  useEffect(() => {
    initializeServices();

    return () => {
      if (wsService) {
        wsService.disconnect();
      }
      if (audioService) {
        audioService.cleanup();
      }
    };
  }, [initializeServices]);

  return { wsService, audioService, isConnected };
};