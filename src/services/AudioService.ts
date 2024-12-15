import { AudioRecorder } from '@/components/audio/AudioRecorder';
import { WebSocketService } from './WebSocketService';

export class AudioService {
  private audioContext: AudioContext | null = null;
  private recorder: AudioRecorder | null = null;
  private webSocketService: WebSocketService | null = null;

  constructor() {
    this.webSocketService = new WebSocketService();
  }

  async initialize(): Promise<void> {
    // Don't create AudioContext until explicitly needed
    if (!this.audioContext) {
      this.audioContext = new AudioContext({ sampleRate: 24000 });
    }
    await this.webSocketService?.connect();
  }

  async startRecording(): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new AudioContext({ sampleRate: 24000 });
      await this.audioContext.resume();
    }

    try {
      this.recorder = new AudioRecorder(async (audioData: Float32Array) => {
        await this.processAudioData(audioData);
      });
      await this.recorder.start();
    } catch (error) {
      console.error('Error starting recording:', error);
      throw error;
    }
  }

  private async processAudioData(audioData: Float32Array): Promise<void> {
    if (!this.webSocketService?.isConnected()) {
      console.error('WebSocket not connected');
      return;
    }

    try {
      this.webSocketService.sendAudioData(Array.from(audioData));
    } catch (error) {
      console.error('Error sending audio data:', error);
      throw error;
    }
  }

  async playAudioData(audioData: ArrayBuffer): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new AudioContext({ sampleRate: 24000 });
      await this.audioContext.resume();
    }

    try {
      const audioBuffer = await this.audioContext.decodeAudioData(audioData);
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);
      source.start();
    } catch (error) {
      console.error('Error playing audio:', error);
      throw error;
    }
  }

  stopRecording(): void {
    if (this.recorder) {
      this.recorder.stop();
      this.recorder = null;
    }
  }

  cleanup(): void {
    this.stopRecording();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.webSocketService?.disconnect();
  }
}