import { supabase } from '@/integrations/supabase/client';

export class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: number | null = null;

  async connect(): Promise<void> {
    try {
      console.log('Attempting to connect to WebSocket...');
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.error('No authentication token available');
        throw new Error('No authentication token available');
      }

      const wsUrl = `wss://slomrtdygughdpenilco.functions.supabase.co/realtime-chat?token=${session.access_token}`;
      console.log('Connecting to WebSocket URL:', wsUrl);
      
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('WebSocket connected successfully');
        this.reconnectAttempts = 0;
        // Send a test message
        this.sendMessage('test message');
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Received WebSocket message:', data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
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
      console.log(`Attempting to reconnect in ${backoffTime}ms...`);
      this.reconnectTimeout = window.setTimeout(() => {
        this.reconnectAttempts++;
        this.connect();
      }, backoffTime);
    } else {
      console.log('Max reconnection attempts reached');
    }
  }

  sendMessage(message: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('WebSocket is not connected');
      throw new Error('WebSocket is not connected');
    }

    console.log('Sending message:', message);
    this.ws.send(JSON.stringify({ message }));
  }

  sendAudioData(audioData: number[]): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('WebSocket is not connected');
      throw new Error('WebSocket is not connected');
    }

    console.log('Sending audio data...');
    this.ws.send(JSON.stringify({ type: 'audio', data: audioData }));
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  disconnect(): void {
    console.log('Disconnecting WebSocket...');
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}