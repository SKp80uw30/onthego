import { supabase } from '@/integrations/supabase/client';

export class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: number | null = null;
  private onOpenCallback: (() => void) | null = null;
  private onCloseCallback: (() => void) | null = null;
  private onErrorCallback: (() => void) | null = null;
  private connectionId: string;

  constructor() {
    this.connectionId = crypto.randomUUID();
  }

  async connect(): Promise<void> {
    try {
      console.log(`[${this.connectionId}] Attempting to connect to WebSocket...`);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        console.error(`[${this.connectionId}] No authentication token available`);
        throw new Error('No authentication token available');
      }

      const wsUrl = `wss://slomrtdygughdpenilco.functions.supabase.co/realtime-chat?token=${session.access_token}`;
      console.log(`[${this.connectionId}] Connecting to WebSocket URL:`, wsUrl);
      
      if (this.ws) {
        console.log(`[${this.connectionId}] Closing existing connection`);
        this.ws.close();
      }

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log(`[${this.connectionId}] WebSocket connected successfully`);
        this.reconnectAttempts = 0;
        this.onOpenCallback?.();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log(`[${this.connectionId}] Received WebSocket message:`, data);
        } catch (error) {
          console.error(`[${this.connectionId}] Error parsing WebSocket message:`, error);
        }
      };

      this.ws.onerror = (error) => {
        console.error(`[${this.connectionId}] WebSocket error:`, error);
        this.onErrorCallback?.();
      };

      this.ws.onclose = (event) => {
        console.log(`[${this.connectionId}] WebSocket closed with code:`, event.code, 'reason:', event.reason);
        this.onCloseCallback?.();
        if (event.code !== 1000) { // Normal closure
          this.attemptReconnect();
        }
      };
    } catch (error) {
      console.error(`[${this.connectionId}] Error connecting to WebSocket:`, error);
      throw error;
    }
  }

  onOpen(callback: () => void): void {
    this.onOpenCallback = callback;
  }

  onClose(callback: () => void): void {
    this.onCloseCallback = callback;
  }

  onError(callback: () => void): void {
    this.onErrorCallback = callback;
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      const backoffTime = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
      console.log(`[${this.connectionId}] Attempting to reconnect in ${backoffTime}ms... (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
      
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
      }
      
      this.reconnectTimeout = window.setTimeout(() => {
        this.reconnectAttempts++;
        this.connect().catch(error => {
          console.error(`[${this.connectionId}] Reconnection attempt failed:`, error);
        });
      }, backoffTime);
    } else {
      console.log(`[${this.connectionId}] Max reconnection attempts reached`);
    }
  }

  sendMessage(message: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('WebSocket is not connected');
      throw new Error('WebSocket is not connected');
    }

    console.log('Sending message:', message);
    this.ws.send(JSON.stringify({ type: 'message', data: message }));
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
    console.log(`[${this.connectionId}] Disconnecting WebSocket...`);
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    if (this.ws) {
      this.ws.close(1000, 'Client disconnecting');
      this.ws = null;
    }
  }
}
