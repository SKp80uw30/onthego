import { AudioRecorder } from '@/components/audio/AudioRecorder';

export class AudioService {
  private audioContext: AudioContext | null = null;
  private recorder: AudioRecorder | null = null;

  constructor(private onAudioData: (audioData: Float32Array) => void) {}

  async initialize(): Promise<void> {
    try {
      this.audioContext = new AudioContext({ sampleRate: 24000 });
      await this.audioContext.resume();
    } catch (error) {
      console.error('Error initializing AudioContext:', error);
      throw error;
    }
  }

  async startRecording(): Promise<void> {
    if (!this.audioContext) {
      throw new Error('AudioContext not initialized');
    }

    try {
      this.recorder = new AudioRecorder(this.onAudioData);
      await this.recorder.start();
    } catch (error) {
      console.error('Error starting recording:', error);
      throw error;
    }
  }

  stopRecording(): void {
    if (this.recorder) {
      this.recorder.stop();
      this.recorder = null;
    }
  }

  async playAudio(audioData: Uint8Array): Promise<void> {
    if (!this.audioContext) {
      throw new Error('AudioContext not initialized');
    }

    try {
      const audioBuffer = await this.audioContext.decodeAudioData(audioData.buffer);
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);
      source.start();
    } catch (error) {
      console.error('Error playing audio:', error);
      throw error;
    }
  }

  cleanup(): void {
    this.stopRecording();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}