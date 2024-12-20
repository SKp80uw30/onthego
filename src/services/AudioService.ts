import { AudioRecorder } from '@/components/audio/AudioRecorder';
import { OpenAIService } from './OpenAIService';
import { TextToSpeechService } from './TextToSpeechService';
import { AudioTranscriptionService } from './AudioTranscriptionService';
import { toast } from 'sonner';

export class AudioService {
  private audioRecorder: AudioRecorder | null = null;
  private openAIService: OpenAIService;
  private textToSpeechService: TextToSpeechService;
  private transcriptionService: AudioTranscriptionService;
  private initialized: boolean = false;
  private transcriptionCallback: ((text: string) => void) | null = null;

  constructor() {
    console.log('[AudioService] Constructor called');
    this.openAIService = new OpenAIService();
    this.textToSpeechService = new TextToSpeechService();
    this.transcriptionService = new AudioTranscriptionService();
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
          const transcribedText = await this.transcriptionService.transcribeAudio(audioBlob);
          if (transcribedText && this.transcriptionCallback) {
            this.transcriptionCallback(transcribedText);
          }
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

  onTranscription(callback: (text: string) => void) {
    this.transcriptionCallback = callback;
  }

  async textToSpeech(text: string) {
    return this.textToSpeechService.speakText(text);
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
    this.transcriptionCallback = null;
  }
}