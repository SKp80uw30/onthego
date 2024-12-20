import { OpenAIService } from './OpenAIService';
import { TextToSpeechService } from './TextToSpeechService';
import { AudioTranscriptionService } from './AudioTranscriptionService';
import { AudioStateManager } from './audio/AudioStateManager';
import { AudioProcessor } from './audio/AudioProcessor';
import { AudioRecorderManager } from './audio/AudioRecorderManager';
import { toast } from 'sonner';

export class AudioService {
  private stateManager: AudioStateManager;
  private processor: AudioProcessor;
  private recorderManager: AudioRecorderManager;
  private openAIService: OpenAIService;
  private textToSpeechService: TextToSpeechService;

  constructor() {
    console.log('[AudioService] Constructor called');
    this.stateManager = new AudioStateManager();
    this.openAIService = new OpenAIService();
    this.textToSpeechService = new TextToSpeechService();
    
    const transcriptionService = new AudioTranscriptionService();
    this.processor = new AudioProcessor(transcriptionService, this.stateManager);
    this.recorderManager = new AudioRecorderManager(this.processor);
  }

  async initialize() {
    try {
      console.log('[AudioService] Initializing audio service...');
      if (this.stateManager.isInitialized()) {
        console.log('[AudioService] Audio service already initialized');
        return;
      }

      await this.openAIService.initialize();
      console.log('[AudioService] OpenAI service initialized');
      
      this.stateManager.setInitialized(true);
      console.log('[AudioService] Audio service initialized successfully');
    } catch (error) {
      console.error('[AudioService] Error initializing audio service:', error);
      this.stateManager.setInitialized(false);
      toast.error('Failed to initialize audio service. Please refresh the page.');
      throw error;
    }
  }

  onTranscription(callback: (text: string) => void) {
    this.stateManager.setTranscriptionCallback(callback);
  }

  async textToSpeech(text: string) {
    return this.textToSpeechService.speakText(text);
  }

  async startRecording() {
    if (!this.stateManager.isInitialized()) {
      toast.error('Audio service not ready. Please refresh the page.');
      throw new Error('Audio service not initialized');
    }
    await this.recorderManager.startRecording();
  }

  async stopRecording() {
    if (!this.stateManager.isInitialized()) {
      toast.error('Audio service not ready. Please refresh the page.');
      throw new Error('Audio service not initialized');
    }
    await this.recorderManager.stopRecording();
  }

  getOpenAIService(): OpenAIService {
    return this.openAIService;
  }

  cleanup() {
    console.log('[AudioService] Cleaning up');
    this.recorderManager.cleanup();
    this.openAIService.cleanup();
    this.stateManager.reset();
  }
}