import { useState, useEffect } from 'react';
import { toast } from 'sonner';

export const useRealtimeChat = () => {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    console.log('Initializing WebSocket connection...');
    // Fix the WebSocket URL format - add /functions/v1/
    const socket = new WebSocket(`wss://slomrtdygughdpenilco.functions.supabase.co/functions/v1/realtime-chat`);
    
    socket.onopen = () => {
      console.log('Connected to chat server');
      setIsConnected(true);
      // Initialize AudioContext only after connection is established
      const context = new AudioContext();
      setAudioContext(context);
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
        
        if (audioContext && audioContext.state === 'running') {
          try {
            const audioBuffer = await audioContext.decodeAudioData(audioArray.buffer);
            const source = audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContext.destination);
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

    return () => {
      socket.close();
      if (audioContext) {
        audioContext.close();
      }
    };
  }, []);

  return { ws, audioContext, isConnected };
};