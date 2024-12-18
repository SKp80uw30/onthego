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
      console.log('[AudioService] OpenAI service initialized');
      
      this.audioRecorder = new AudioRecorder();
      console.log('[AudioService] Audio recorder created');
      
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

  async startRecording() {
    console.log('[AudioService] Starting recording...');
    if (!this.audioRecorder || !this.initialized) {
      const error = new Error('Audio recorder not initialized');
      console.error('[AudioService] Error:', error);
      throw error;
    }
    console.log('[AudioService] Starting audio recorder');
    await this.audioRecorder.start();
    console.log('[AudioService] Recording started successfully');
  }

  stopRecording() {
    if (!this.audioRecorder || !this.initialized) {
      const error = new Error('Audio recorder not initialized');
      console.error('[AudioService] Error:', error);
      throw error;
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