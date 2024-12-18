import { AudioRecorder } from '@/components/audio/AudioRecorder';
import { OpenAIService } from './OpenAIService';
import { toast } from 'sonner';

export class AudioRecorderManager {
  private recorder: AudioRecorder | null = null;
  private openAIService: OpenAIService;
  private isInitialized = false;
  private audioChunks: Blob[] = [];

  constructor() {
    this.openAIService = new OpenAIService();
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('AudioRecorderManager already initialized');
      return;
    }

    try {
      console.log('Initializing AudioRecorderManager...');
      this.isInitialized = true;
      console.log('AudioRecorderManager initialized successfully');
    } catch (error) {
      console.error('Error initializing AudioRecorderManager:', error);
      this.isInitialized = false;
      throw error;
    }
  }

  async startRecording(): Promise<void> {
    try {
      console.log('Starting audio recording...');
      if (!this.recorder) {
        this.recorder = new AudioRecorder(async (blob: Blob) => {
          console.log('Received audio blob:', blob);
          this.audioChunks.push(blob);
        });
      }
      
      await this.recorder.start();
      console.log('Recording started successfully');
    } catch (error) {
      console.error('Failed to start recording:', error);
      toast.error('Error starting recording');
      throw error;
    }
  }

  async stopRecording(): Promise<void> {
    try {
      console.log('Stopping recording...');
      if (this.recorder) {
        await this.recorder.stop();
        this.recorder = null;

        // Process the collected audio chunks
        if (this.audioChunks.length > 0) {
          const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
          this.audioChunks = []; // Clear the chunks

          // Process with OpenAI
          await this.openAIService.processAudioChunk(audioBlob);
        }
      }
    } catch (error) {
      console.error('Error stopping recording:', error);
      toast.error('Error stopping recording');
      throw error;
    }
  }

  cleanup(): void {
    try {
      console.log('Cleaning up AudioRecorderManager...');
      if (this.recorder) {
        this.recorder.stop();
        this.recorder = null;
      }
      this.openAIService.cleanup();
      this.isInitialized = false;
      this.audioChunks = [];
      console.log('AudioRecorderManager cleanup complete');
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }
}