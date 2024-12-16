import { AudioRecorder } from '@/components/audio/AudioRecorder';
import { Session } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { encodeAudioForAPI } from '@/utils/audio';
import { supabase } from '@/integrations/supabase/client';

export class AudioRecorderManager {
  private recorder: AudioRecorder | null = null;
  private isInitialized = false;
  private session: Session | null = null;

  async initialize(session: Session): Promise<void> {
    try {
      console.log('Initializing AudioRecorderManager...');
      this.session = session;
      this.isInitialized = true;
      console.log('AudioRecorderManager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize audio recorder:', error);
      toast.error('Failed to initialize audio service');
      throw error;
    }
  }

  async startRecording(): Promise<void> {
    if (!this.isInitialized) {
      const error = new Error('Audio service not initialized');
      console.error(error);
      toast.error('Audio service not initialized');
      throw error;
    }

    try {
      console.log('Starting audio recording...');
      this.recorder = new AudioRecorder(async (audioData: Float32Array) => {
        try {
          await this.sendAudioChunk(audioData);
        } catch (error) {
          console.error('Error in audio data callback:', error);
          toast.error('Error processing audio chunk');
        }
      });
      
      await this.recorder.start();
      console.log('Recording started successfully');
    } catch (error) {
      console.error('Failed to start recording:', error);
      toast.error('Failed to start recording');
      throw error;
    }
  }

  private async sendAudioChunk(audioData: Float32Array) {
    if (!this.session) {
      console.error('No active session found');
      return;
    }

    try {
      console.log('Encoding audio chunk...');
      const base64Audio = encodeAudioForAPI(audioData);
      
      console.log('Sending audio chunk to process-audio function...');
      const { data, error } = await supabase.functions.invoke('process-audio', {
        body: { audio: base64Audio }
      });

      if (error) {
        console.error('Supabase function error:', error);
        toast.error('Error processing audio');
        return;
      }

      console.log('Audio chunk processed successfully:', data);
    } catch (error) {
      console.error('Error sending audio chunk:', error);
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        toast.error('Network error - Failed to send audio chunk');
      } else if (error instanceof SyntaxError) {
        toast.error('Error parsing server response');
      } else {
        toast.error('Unexpected error processing audio');
      }
    }
  }

  stopRecording(): void {
    try {
      console.log('Stopping recording...');
      if (this.recorder) {
        this.recorder.stop();
        this.recorder = null;
        console.log('Recording stopped successfully');
      }
    } catch (error) {
      console.error('Error stopping recording:', error);
      toast.error('Error stopping recording');
    }
  }

  cleanup(): void {
    try {
      console.log('Cleaning up AudioRecorderManager...');
      this.stopRecording();
      this.isInitialized = false;
      this.session = null;
      console.log('AudioRecorderManager cleanup complete');
    } catch (error) {
      console.error('Error during cleanup:', error);
      toast.error('Error cleaning up audio recorder');
    }
  }
}