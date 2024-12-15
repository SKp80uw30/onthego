import { AudioRecorder } from '@/components/audio/AudioRecorder';
import { WebSocketManager } from './WebSocketManager';
import { Session } from '@supabase/supabase-js';
import { toast } from 'sonner';

export class AudioRecorderManager {
  private recorder: AudioRecorder | null = null;
  private wsManager: WebSocketManager;
  private isInitialized = false;

  constructor() {
    this.wsManager = new WebSocketManager();
  }

  async initialize(session: Session): Promise<void> {
    try {
      await this.wsManager.connect(session);
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize audio recorder:', error);
      toast.error('Failed to initialize audio service');
      throw error;
    }
  }

  async startRecording(): Promise<void> {
    if (!this.isInitialized) {
      toast.error('Audio service not initialized');
      return;
    }

    try {
      this.recorder = new AudioRecorder((audioData: Float32Array) => {
        this.wsManager.sendAudioData(audioData);
      });
      
      await this.recorder.start();
      toast.success('Recording started');
    } catch (error) {
      console.error('Failed to start recording:', error);
      toast.error('Failed to start recording');
      throw error;
    }
  }

  stopRecording(): void {
    if (this.recorder) {
      this.recorder.stop();
      this.recorder = null;
      toast.success('Recording stopped');
    }
  }

  cleanup(): void {
    this.stopRecording();
    this.wsManager.disconnect();
    this.isInitialized = false;
  }
}