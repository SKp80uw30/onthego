import { AudioRecorderManager } from './AudioRecorderManager';
import { VADService } from './VADService';
import { toast } from 'sonner';

export class AudioService {
  private ws: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private audioQueue: AudioQueue | null = null;

  async initialize(): Promise<void> {
    try {
      this.audioContext = new AudioContext({ sampleRate: 24000 });
      this.audioQueue = new AudioQueue(this.audioContext);
      
      // Connect to our Edge Function WebSocket
      this.ws = new WebSocket(`wss://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.functions.supabase.co/realtime-chat`);
      
      this.ws.onmessage = async (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'response.audio.delta') {
          // Convert base64 to audio data and play
          const audioData = this.base64ToUint8Array(data.delta);
          await this.audioQueue.addToQueue(audioData);
        } else if (data.type === 'response.audio_transcript.delta') {
          console.log('Transcript:', data.delta);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        toast.error('Connection error');
      };

    } catch (error) {
      console.error('Error initializing audio service:', error);
      throw error;
    }
  }

  async startListening(): Promise<void> {
    if (!this.audioContext || !this.ws) {
      throw new Error('Audio service not initialized');
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      const source = this.audioContext.createMediaStreamSource(stream);
      const processor = this.audioContext.createScriptProcessor(4096, 1, 1);
      
      processor.onaudioprocess = (e) => {
        if (this.ws?.readyState === WebSocket.OPEN) {
          const inputData = e.inputBuffer.getChannelData(0);
          const audioData = this.encodeAudioData(inputData);
          
          this.ws.send(JSON.stringify({
            type: 'input_audio_buffer.append',
            audio: audioData
          }));
        }
      };

      source.connect(processor);
      processor.connect(this.audioContext.destination);
      
      toast.success('Listening...');
    } catch (error) {
      console.error('Error starting listening:', error);
      throw error;
    }
  }

  stopListening(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.close();
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.audioQueue = null;
  }

  cleanup(): void {
    this.stopListening();
    this.ws = null;
    this.audioContext = null;
    this.audioQueue = null;
  }

  private encodeAudioData(float32Array: Float32Array): string {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return btoa(String.fromCharCode.apply(null, new Uint8Array(int16Array.buffer)));
  }

  private base64ToUint8Array(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }
}

class AudioQueue {
  private queue: Uint8Array[] = [];
  private isPlaying = false;

  constructor(private audioContext: AudioContext) {}

  async addToQueue(audioData: Uint8Array) {
    this.queue.push(audioData);
    if (!this.isPlaying) {
      await this.playNext();
    }
  }

  private async playNext() {
    if (this.queue.length === 0) {
      this.isPlaying = false;
      return;
    }

    this.isPlaying = true;
    const audioData = this.queue.shift()!;

    try {
      const audioBuffer = await this.audioContext.decodeAudioData(audioData.buffer);
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);
      source.onended = () => this.playNext();
      source.start(0);
    } catch (error) {
      console.error('Error playing audio:', error);
      this.playNext();
    }
  }
}