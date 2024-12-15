import { supabase } from '@/integrations/supabase/client';

export class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: number | null = null;

  async connect(): Promise<void> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No authentication token available');
      }

      const wsUrl = `wss://slomrtdygughdpenilco.functions.supabase.co/realtime-chat?token=${session.access_token}`;
      
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = async (event) => {
        try {
          const audioData = await event.data.arrayBuffer();
          const audioService = new AudioService();
          await audioService.playAudioData(audioData);
        } catch (error) {
          console.error('Error processing received audio:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      this.ws.onclose = () => {
        console.log('WebSocket closed');
        this.attemptReconnect();
      };
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
      throw error;
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      const backoffTime = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
      this.reconnectTimeout = window.setTimeout(() => {
        this.reconnectAttempts++;
        this.connect();
      }, backoffTime);
    }
  }

  sendAudioData(audioData: number[]): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected');
    }

    this.ws.send(JSON.stringify({ audio: audioData }));
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}