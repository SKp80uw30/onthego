import { AudioRecorder } from '@/components/audio/AudioRecorder';
import { OpenAIService } from './OpenAIService';

export class AudioService {
  private audioRecorder: AudioRecorder | null = null;
  private openAIService: OpenAIService;
  private initialized: boolean = false;

  constructor() {
    console.log('[AudioService] Constructor called');
    this.openAIService = new OpenAIService();
  }

  async initialize() {
    try {
      console.log('[AudioService] Initializing audio service...');
      if (this.initialized) {
        console.log('[AudioService] Audio service already initialized');
        return;
      }

      await this.openAIService.initialize();
      this.audioRecorder = new AudioRecorder();
      
      // Set up the callback for when audio data is available
      this.audioRecorder.setOnDataAvailable(async (audioBlob: Blob) => {
        console.log('[AudioService] Processing audio...', { blobSize: audioBlob.size });
        try {
          if (!this.openAIService.isInitialized()) {
            console.log('[AudioService] OpenAI service not initialized yet, retrying initialization...');
            await this.openAIService.initialize();
            if (!this.openAIService.isInitialized()) {
              console.log('[AudioService] Still unable to initialize OpenAI service');
              return;
            }
          }
          await this.openAIService.processAudioChunk(audioBlob);
        } catch (error) {
          console.error('[AudioService] Error processing audio chunk:', error);
        }
      });

      this.initialized = true;
      console.log('[AudioService] Audio service initialized successfully');
    } catch (error) {
      console.error('[AudioService] Error initializing audio service:', error);
      throw error;
    }
  }

  startRecording() {
    if (!this.audioRecorder) {
      console.error('[AudioService] Audio recorder not initialized');
      throw new Error('Audio recorder not initialized');
    }
    console.log('[AudioService] Started recording');
    this.audioRecorder.start();
  }

  stopRecording() {
    if (!this.audioRecorder) {
      console.error('[AudioService] Audio recorder not initialized');
      throw new Error('Audio recorder not initialized');
    }
    console.log('[AudioService] Stopped recording');
    this.audioRecorder.stop();
  }

  getOpenAIService(): OpenAIService {
    return this.openAIService;
  }

  cleanup() {
    console.log('[AudioService] Cleaning up');
    if (this.audioRecorder) {
      this.audioRecorder.cleanupResources();
      this.audioRecorder = null;
    }
    this.openAIService.cleanup();
    this.initialized = false;
  }
}