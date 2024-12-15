import { Session } from '@supabase/supabase-js';
import { toast } from 'sonner';

export class WebSocketManager {
  private ws: WebSocket | null = null;
  private connectionId: string;
  private onMessageCallback: ((data: any) => void) | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnecting = false;

  constructor() {
    this.connectionId = Math.random().toString(36).substring(7);
  }

  async connect(session: Session): Promise<void> {
    if (!session?.access_token) {
      throw new Error('No valid session token');
    }

    if (this.isConnecting) {
      console.log('Already attempting to connect');
      return;
    }

    this.isConnecting = true;

    try {
      if (this.ws) {
        this.ws.close();
      }

      const wsUrl = new URL('realtime-chat', 'wss://slomrtdygughdpenilco.functions.supabase.co/');
      wsUrl.searchParams.set('token', session.access_token);

      this.ws = new WebSocket(wsUrl.toString());

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
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
        this.isConnecting = false;
      };

      this.ws.onclose = () => {
        console.log('WebSocket closed');
        this.isConnecting = false;
        this.ws = null;

        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
          setTimeout(() => this.connect(session), this.reconnectDelay);
        } else {
          console.log('Max reconnection attempts reached');
          toast.error('Connection lost. Please try again.');
        }
      };
    } catch (error) {
      console.error('WebSocket connection error:', error);
      this.isConnecting = false;
      toast.error('Failed to connect');
      throw error;
    }
  }

  sendAudioData(audioData: Float32Array): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not connected');
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

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}