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
      console.log('Requesting microphone access...');
      await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('Creating media recorder...');
      this.audioRecorder = new AudioRecorder();
      await this.audioRecorder.initialize();
      
      // Set up the callback for when audio data is available
      this.audioRecorder.onAudioAvailable = async (audioBlob: Blob) => {
        console.log('Processing audio...', { blobSize: audioBlob.size });
        try {
          await this.openAIService.processAudioChunk(audioBlob);
        } catch (error) {
          console.error('Error processing audio chunk:', error);
        }
      };
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
    this.audioRecorder.startRecording();
  }

  stopRecording() {
    if (!this.audioRecorder) {
      throw new Error('Audio recorder not initialized');
    }
    console.log('Stopped recording');
    this.audioRecorder.stopRecording();
  }

  cleanup() {
    if (this.audioRecorder) {
      this.audioRecorder.cleanup();
      this.audioRecorder = null;
    }
    this.openAIService.cleanup();
  }
}