export class WebSocketService {
  private socket: WebSocket | null = null;
  private maxRetries = 3;
  private retryDelay = 2000;
  private currentRetry = 0;
  private messageHandlers: ((data: any) => void)[] = [];

  constructor(private url: string, private token: string) {}

  async connect(): Promise<void> {
    console.log('Initializing WebSocket connection...');
    
    try {
      this.socket = new WebSocket(`${this.url}?token=${this.token}`);

      this.socket.onopen = () => {
        console.log('WebSocket connection established');
        this.currentRetry = 0;
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.messageHandlers.forEach(handler => handler(data));
        } catch (error) {
          console.error('Error processing message:', error);
        }
      };

      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.reconnect();
      };

      this.socket.onclose = () => {
        console.log('WebSocket closed');
        this.reconnect();
      };
    } catch (error) {
      console.error('Error creating WebSocket:', error);
      this.reconnect();
    }
  }

  private reconnect(): void {
    if (this.currentRetry < this.maxRetries) {
      this.currentRetry++;
      const delay = this.retryDelay * Math.pow(2, this.currentRetry - 1);
      console.log(`Retrying connection (${this.currentRetry}/${this.maxRetries}) in ${delay}ms...`);
      
      setTimeout(() => {
        this.connect();
      }, delay);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  public isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  public send(data: any): void {
    if (this.isConnected()) {
      this.socket!.send(JSON.stringify(data));
    } else {
      console.error('WebSocket is not connected');
    }
  }

  public onMessage(handler: (data: any) => void): void {
    this.messageHandlers.push(handler);
  }

  public disconnect(): void {
    this.messageHandlers = [];
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
}