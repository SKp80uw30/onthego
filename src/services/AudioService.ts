import { AudioRecorder } from '@/components/audio/AudioRecorder';
import { OpenAIService } from './OpenAIService';

export class AudioService {
  private audioRecorder: AudioRecorder | null = null;
  private openAIService: OpenAIService;
  private initialized: boolean = false;

  constructor() {
    this.openAIService = new OpenAIService();
  }

  async initialize() {
    try {
      console.log('Initializing audio service...');
      if (this.initialized) {
        console.log('Audio service already initialized');
        return;
      }

      await this.openAIService.initialize();
      this.audioRecorder = new AudioRecorder();
      
      // Set up the callback for when audio data is available
      this.audioRecorder.setOnDataAvailable(async (audioBlob: Blob) => {
        console.log('Processing audio...', { blobSize: audioBlob.size });
        try {
          if (!this.openAIService.isInitialized()) {
            console.log('OpenAI service not initialized yet, retrying initialization...');
            await this.openAIService.initialize();
            if (!this.openAIService.isInitialized()) {
              console.log('Still unable to initialize OpenAI service');
              return;
            }
          }
          await this.openAIService.processAudioChunk(audioBlob);
        } catch (error) {
          console.error('Error processing audio chunk:', error);
        }
      });

      this.initialized = true;
      console.log('Audio service initialized successfully');
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

  getOpenAIService(): OpenAIService {
    return this.openAIService;
  }

  cleanup() {
    if (this.audioRecorder) {
      this.audioRecorder.cleanupResources();
      this.audioRecorder = null;
    }
    this.openAIService.cleanup();
    this.initialized = false;
  }
}