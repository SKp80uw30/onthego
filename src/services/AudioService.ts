import { AudioRecorder } from '@/components/audio/AudioRecorder';
import { supabase } from '@/integrations/supabase/client';

export class AudioService {
  private audioContext: AudioContext | null = null;
  private recorder: AudioRecorder | null = null;

  constructor() {}

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
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch(
        'https://slomrtdygughdpenilco.functions.supabase.co/functions/v1/process-audio',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            audio: Array.from(audioData),
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const audioBlob = await response.blob();
      await this.playAudioBlob(audioBlob);
    } catch (error) {
      console.error('Error processing audio:', error);
      throw error;
    }
  }

  private async playAudioBlob(audioBlob: Blob): Promise<void> {
    if (!this.audioContext) {
      throw new Error('AudioContext not initialized');
    }

    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
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
  }
}