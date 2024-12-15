import { useState, useEffect } from 'react';
import { toast } from 'sonner';

export const useRealtimeChat = () => {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 3;
    let retryTimeout: NodeJS.Timeout;

    const connectWebSocket = () => {
      console.log('Initializing WebSocket connection...');
      
      // Close existing connection if any
      if (ws) {
        ws.close();
      }
      
      const socket = new WebSocket(`wss://slomrtdygughdpenilco.functions.supabase.co/functions/v1/realtime-chat`);
      
      socket.onopen = async () => {
        console.log('Connected to chat server');
        setIsConnected(true);
        retryCount = 0;
        
        // Initialize AudioContext only after connection is established
        try {
          const context = new AudioContext({
            sampleRate: 24000,
          });
          await context.resume(); // Ensure audio context is running
          setAudioContext(context);
        } catch (error) {
          console.error('Error creating AudioContext:', error);
          toast.error('Error initializing audio system');
        }
      };

      socket.onmessage = async (event) => {
        try {
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
        } catch (error) {
          console.error('Error processing message:', error);
        }
      };

      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
        
        if (retryCount < maxRetries) {
          retryCount++;
          console.log(`Retrying connection (${retryCount}/${maxRetries})...`);
          retryTimeout = setTimeout(connectWebSocket, 2000 * retryCount);
        } else {
          toast.error('Connection failed after multiple attempts');
        }
      };

      socket.onclose = () => {
        console.log('WebSocket closed');
        setIsConnected(false);
        
        if (retryCount < maxRetries) {
          retryTimeout = setTimeout(connectWebSocket, 2000);
        }
      };

      setWs(socket);
    };

    connectWebSocket();

    return () => {
      if (ws) {
        ws.close();
      }
      if (audioContext) {
        audioContext.close();
      }
      clearTimeout(retryTimeout);
    };
  }, []);

  return { ws, audioContext, isConnected };
};