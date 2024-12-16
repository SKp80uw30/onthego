import { AudioRecorder } from '@/components/audio/AudioRecorder';
import { Session } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { encodeAudioForAPI } from '@/utils/audio';

export class AudioRecorderManager {
  private recorder: AudioRecorder | null = null;
  private isInitialized = false;
  private session: Session | null = null;

  async initialize(session: Session): Promise<void> {
    try {
      this.session = session;
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
      this.recorder = new AudioRecorder(async (audioData: Float32Array) => {
        await this.sendAudioChunk(audioData);
      });
      
      await this.recorder.start();
      console.log('Recording started');
    } catch (error) {
      console.error('Failed to start recording:', error);
      toast.error('Failed to start recording');
      throw error;
    }
  }

  private async sendAudioChunk(audioData: Float32Array) {
    if (!this.session) {
      console.error('No active session');
      return;
    }

    try {
      const base64Audio = encodeAudioForAPI(audioData);
      
      const response = await fetch('/api/process-audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.session.access_token}`,
        },
        body: JSON.stringify({ audio: base64Audio }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Audio chunk processed:', result);
    } catch (error) {
      console.error('Error sending audio chunk:', error);
    }
  }

  stopRecording(): void {
    if (this.recorder) {
      this.recorder.stop();
      this.recorder = null;
      console.log('Recording stopped');
    }
  }

  cleanup(): void {
    this.stopRecording();
    this.isInitialized = false;
    this.session = null;
  }
}