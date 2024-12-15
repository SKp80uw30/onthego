import { Session } from '@supabase/supabase-js';

export class WebSocketService {
  private ws: WebSocket | null = null;
  private connectionId: string;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 2000;
  private onOpenCallback: (() => void) | null = null;
  private onCloseCallback: (() => void) | null = null;
  private onErrorCallback: ((error: Event) => void) | null = null;

  constructor() {
    this.connectionId = Math.random().toString(36).substring(7);
    console.log(`[WebSocket ${this.connectionId}] Service initialized`);
  }

  async connect(session: Session) {
    try {
      if (this.ws) {
        this.ws.close();
      }

      console.log(`[WebSocket ${this.connectionId}] Starting connection process...`);

      if (!session || !session.access_token) {
        throw new Error('No valid session token available');
      }

      console.log(`[WebSocket ${this.connectionId}] Got valid session token`);

      const wsUrl = new URL('realtime-chat', 'wss://slomrtdygughdpenilco.supabase.co/functions/v1/');
      wsUrl.searchParams.set('token', session.access_token);
      
      console.log(`[WebSocket ${this.connectionId}] Connecting to:`, wsUrl.toString());

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log(`[WebSocket ${this.connectionId}] Connection established`);
        this.reconnectAttempts = 0;
        if (this.onOpenCallback) this.onOpenCallback();
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
        if (this.onErrorCallback) this.onErrorCallback(error);
      };

      this.ws.onclose = () => {
        console.log(`[WebSocket ${this.connectionId}] Connection closed`);
        if (this.onCloseCallback) this.onCloseCallback();
        this.handleReconnect(session);
      };

    } catch (error) {
      console.error(`[WebSocket ${this.connectionId}] Connection error:`, error);
      this.handleReconnect(session);
    }
  }

  private handleReconnect(session: Session) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`[WebSocket ${this.connectionId}] Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      setTimeout(() => this.connect(session), this.reconnectDelay);
    } else {
      console.error(`[WebSocket ${this.connectionId}] Max reconnection attempts reached`);
    }
  }

  disconnect() {
    if (this.ws) {
      console.log(`[WebSocket ${this.connectionId}] Disconnecting...`);
      this.ws.close();
      this.ws = null;
    }
  }

  onOpen(callback: () => void) {
    this.onOpenCallback = callback;
  }

  onClose(callback: () => void) {
    this.onCloseCallback = callback;
  }

  onError(callback: (error: Event) => void) {
    this.onErrorCallback = callback;
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  sendAudioData(audioData: number[]) {
    if (this.isConnected()) {
      this.ws!.send(JSON.stringify({ type: 'audio', data: audioData }));
    } else {
      console.error(`[WebSocket ${this.connectionId}] Cannot send audio data - connection not open`);
    }
  }

  send(message: string) {
    if (this.isConnected()) {
      this.ws!.send(message);
    } else {
      console.error(`[WebSocket ${this.connectionId}] Cannot send message - connection not open`);
    }
  }
}