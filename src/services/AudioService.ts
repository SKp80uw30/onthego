import { AudioRecorder } from '@/components/audio/AudioRecorder';
import { OpenAIService } from './OpenAIService';
import { toast } from 'sonner';

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
              toast.error('Service not ready. Please try again.');
              return;
            }
          }

          const result = await this.openAIService.processAudioChunk(audioBlob);
          if (!result) {
            console.log('[AudioService] No result from audio processing');
            toast.error('Unable to process audio. Please try again.');
            return;
          }
          console.log('[AudioService] Audio processing successful:', result);
        } catch (error) {
          console.error('[AudioService] Error processing audio chunk:', error);
          if (error.message?.includes('Service Unavailable')) {
            toast.error('Service temporarily unavailable. Please try again in a moment.');
          } else {
            toast.error('Error processing audio. Please try again.');
          }
        }
      });

      this.initialized = true;
      console.log('[AudioService] Audio service initialized successfully');
    } catch (error) {
      console.error('[AudioService] Error initializing audio service:', error);
      this.initialized = false;
      toast.error('Failed to initialize audio service. Please refresh the page.');
      throw error;
    }
  }

  async startRecording() {
    try {
      console.log('[AudioService] Starting recording...');
      if (!this.audioRecorder || !this.initialized) {
        const error = new Error('Audio recorder not initialized');
        console.error('[AudioService] Error:', error);
        toast.error('Audio service not ready. Please refresh the page.');
        throw error;
      }
      console.log('[AudioService] Starting audio recorder');
      await this.audioRecorder.start();
      console.log('[AudioService] Recording started successfully');
    } catch (error) {
      console.error('[AudioService] Error starting recording:', error);
      toast.error('Failed to start recording. Please check microphone permissions.');
      throw error;
    }
  }

  async stopRecording() {
    try {
      if (!this.audioRecorder || !this.initialized) {
        const error = new Error('Audio recorder not initialized');
        console.error('[AudioService] Error:', error);
        toast.error('Audio service not ready. Please refresh the page.');
        throw error;
      }
      console.log('[AudioService] Stopped recording');
      await this.audioRecorder.stop();
    } catch (error) {
      console.error('[AudioService] Error stopping recording:', error);
      toast.error('Failed to stop recording properly.');
      throw error;
    }
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