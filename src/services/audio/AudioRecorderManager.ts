import { AudioRecorder } from '@/components/audio/AudioRecorder';
import { AudioProcessor } from './AudioProcessor';
import { toast } from 'sonner';

export class AudioRecorderManager {
  private recorder: AudioRecorder | null = null;

  constructor(private audioProcessor: AudioProcessor) {}

  async startRecording() {
    try {
      console.log('[AudioRecorderManager] Starting recording...');
      if (!this.recorder) {
        this.recorder = new AudioRecorder(async (audioBlob: Blob) => {
          await this.audioProcessor.processAudioBlob(audioBlob);
        });
      }
      
      await this.recorder.start();
      console.log('[AudioRecorderManager] Recording started successfully');
    } catch (error) {
      console.error('[AudioRecorderManager] Error starting recording:', error);
      toast.error('Failed to start recording. Please check microphone permissions.');
      throw error;
    }
  }

  async stopRecording() {
    try {
      if (!this.recorder) {
        console.log('[AudioRecorderManager] No active recorder to stop');
        return;
      }
      console.log('[AudioRecorderManager] Stopping recording');
      await this.recorder.stop();
    } catch (error) {
      console.error('[AudioRecorderManager] Error stopping recording:', error);
      toast.error('Failed to stop recording properly.');
      throw error;
    }
  }

  cleanup() {
    if (this.recorder) {
      this.recorder.cleanupResources();
      this.recorder = null;
    }
  }
}