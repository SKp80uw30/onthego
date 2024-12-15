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
    console.log(`[WebSocket ${this.connectionId}] Service initialized`);
  }

  async connect(): Promise<void> {
    try {
      console.log(`[WebSocket ${this.connectionId}] Starting connection process...`);
      
      // Get the current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error(`[WebSocket ${this.connectionId}] Session error:`, sessionError);
        throw new Error('Failed to get authentication session');
      }

      if (!session?.access_token) {
        console.error(`[WebSocket ${this.connectionId}] No active session found`);
        throw new Error('No authentication session available');
      }

      console.log(`[WebSocket ${this.connectionId}] Got valid session token`);

      // Create WebSocket URL with the token - using the correct URL format
      const wsUrl = new URL('/functions/v1/realtime-chat', 'wss://slomrtdygughdpenilco.supabase.co');
      wsUrl.searchParams.set('token', session.access_token);
      
      console.log(`[WebSocket ${this.connectionId}] Connecting to:`, 
        wsUrl.toString().replace(/token=([^&]+)/, 'token=[REDACTED]'));

      if (this.ws) {
        console.log(`[WebSocket ${this.connectionId}] Closing existing connection`);
        this.ws.close();
      }

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log(`[WebSocket ${this.connectionId}] Connected successfully`);
        this.reconnectAttempts = 0;
        this.onOpenCallback?.();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log(`[WebSocket ${this.connectionId}] Received message:`, data);
        } catch (error) {
          console.error(`[WebSocket ${this.connectionId}] Error parsing message:`, error);
        }
      };

      this.ws.onerror = (error) => {
        console.error(`[WebSocket ${this.connectionId}] WebSocket error:`, error);
        this.onErrorCallback?.();
      };

      this.ws.onclose = (event) => {
        console.log(`[WebSocket ${this.connectionId}] Connection closed:`, {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean
        });
        this.onCloseCallback?.();
        if (event.code !== 1000) {
          this.attemptReconnect();
        }
      };
    } catch (error) {
      console.error(`[WebSocket ${this.connectionId}] Connection error:`, error);
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
      console.log(`[WebSocket ${this.connectionId}] Attempting to reconnect in ${backoffTime}ms... (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
      
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
      }
      
      this.reconnectTimeout = window.setTimeout(() => {
        this.reconnectAttempts++;
        this.connect().catch(error => {
          console.error(`[WebSocket ${this.connectionId}] Reconnection attempt failed:`, error);
        });
      }, backoffTime);
    } else {
      console.log(`[WebSocket ${this.connectionId}] Max reconnection attempts reached`);
    }
  }

  sendMessage(message: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error(`[WebSocket ${this.connectionId}] Cannot send message: WebSocket is not connected`);
      throw new Error('WebSocket is not connected');
    }

    console.log(`[WebSocket ${this.connectionId}] Sending message:`, message);
    this.ws.send(JSON.stringify({ type: 'message', data: message }));
  }

  sendAudioData(audioData: number[]): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error(`[WebSocket ${this.connectionId}] Cannot send audio: WebSocket is not connected`);
      throw new Error('WebSocket is not connected');
    }

    console.log(`[WebSocket ${this.connectionId}] Sending audio data...`);
    this.ws.send(JSON.stringify({ type: 'audio', data: audioData }));
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  disconnect(): void {
    console.log(`[WebSocket ${this.connectionId}] Disconnecting WebSocket...`);
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    if (this.ws) {
      this.ws.close(1000, 'Client disconnecting');
      this.ws = null;
    }
  }
}