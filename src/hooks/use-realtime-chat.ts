import { useState, useEffect } from 'react';
import { toast } from 'sonner';

export const useRealtimeChat = () => {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    console.log('Initializing WebSocket connection...');
    const socket = new WebSocket(`wss://slomrtdygughdpenilco.functions.supabase.co/realtime-chat`);
    const context = new AudioContext();
    
    socket.onopen = () => {
      console.log('Connected to chat server');
      setIsConnected(true);
    };

    socket.onmessage = async (event) => {
      const data = JSON.parse(event.data);
      console.log('Received message:', data);

      if (data.type === 'response.audio.delta') {
        // Handle audio response
        const audioData = atob(data.delta);
        const audioArray = new Uint8Array(audioData.length);
        for (let i = 0; i < audioData.length; i++) {
          audioArray[i] = audioData.charCodeAt(i);
        }
        
        if (context) {
          try {
            const audioBuffer = await context.decodeAudioData(audioArray.buffer);
            const source = context.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(context.destination);
            source.start();
          } catch (error) {
            console.error('Error playing audio:', error);
          }
        }
      }
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
      toast.error('Connection error. Please try again.');
    };

    socket.onclose = () => {
      console.log('WebSocket closed');
      setIsConnected(false);
    };

    setWs(socket);
    setAudioContext(context);

    return () => {
      socket.close();
      if (context) {
        context.close();
      }
    };
  }, []);

  return { ws, audioContext, isConnected };
};