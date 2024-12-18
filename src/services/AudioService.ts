import { AudioRecorder } from '@/components/audio/AudioRecorder';
import { OpenAIService } from './OpenAIService';

export class AudioService {
  private audioRecorder: AudioRecorder | null = null;
  private openAIService: OpenAIService;

  constructor() {
    this.openAIService = new OpenAIService();
  }

  async initialize() {
    try {
      console.log('Initializing audio service...');
      this.audioRecorder = new AudioRecorder();
      
      // Set up the callback for when audio data is available
      this.audioRecorder.setOnDataAvailable(async (audioBlob: Blob) => {
        console.log('Processing audio...', { blobSize: audioBlob.size });
        try {
          await this.openAIService.processAudioChunk(audioBlob);
        } catch (error) {
          console.error('Error processing audio chunk:', error);
        }
      });
    } catch (error) {
      console.error('Error initializing audio service:', error);
      throw error;
    }
  }

  startRecording() {
    if (!this.audioRecorder) {
      throw new Error('Audio recorder not initialized');
    }
    console.log('Started recording');
    this.audioRecorder.start();
  }

  stopRecording() {
    if (!this.audioRecorder) {
      throw new Error('Audio recorder not initialized');
    }
    console.log('Stopped recording');
    this.audioRecorder.stop();
  }

  cleanup() {
    if (this.audioRecorder) {
      this.audioRecorder.cleanupResources();
      this.audioRecorder = null;
    }
    this.openAIService.cleanup();
  }
}