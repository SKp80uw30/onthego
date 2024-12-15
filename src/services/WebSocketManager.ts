import { Session } from '@supabase/supabase-js';
import { toast } from 'sonner';

export class WebSocketManager {
  private ws: WebSocket | null = null;
  private connectionId: string;
  private onMessageCallback: ((data: any) => void) | null = null;

  constructor() {
    this.connectionId = Math.random().toString(36).substring(7);
  }

  async connect(session: Session): Promise<void> {
    if (!session?.access_token) {
      throw new Error('No valid session token');
    }

    try {
      if (this.ws) {
        this.ws.close();
      }

      // Updated WebSocket URL to use the correct functions domain
      const wsUrl = new URL('realtime-chat', 'wss://slomrtdygughdpenilco.functions.supabase.co/');
      wsUrl.searchParams.set('token', session.access_token);

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        toast.success('Connected to audio service');
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (this.onMessageCallback) {
            this.onMessageCallback(data);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        toast.error('Connection error');
      };

      this.ws.onclose = () => {
        console.log('WebSocket closed');
        toast.error('Connection closed');
      };
    } catch (error) {
      console.error('WebSocket connection error:', error);
      toast.error('Failed to connect');
      throw error;
    }
  }

  sendAudioData(audioData: Float32Array): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('WebSocket not connected');
      return;
    }

    try {
      this.ws.send(JSON.stringify({
        type: 'audio',
        data: Array.from(audioData)
      }));
    } catch (error) {
      console.error('Error sending audio data:', error);
    }
  }

  onMessage(callback: (data: any) => void): void {
    this.onMessageCallback = callback;
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}