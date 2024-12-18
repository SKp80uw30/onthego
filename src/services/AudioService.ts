import { AudioRecorder } from "@/components/audio/AudioRecorder";
import { AudioTranscriptionService } from "./AudioTranscriptionService";
import { toast } from "sonner";

export class AudioService {
  private recorder: AudioRecorder | null = null;
  private transcriptionService: AudioTranscriptionService;
  private isInitialized = false;

  constructor() {
    this.transcriptionService = new AudioTranscriptionService();
  }

  async initialize() {
    try {
      if (this.isInitialized) {
        console.log('Audio service already initialized');
        return true;
      }

      console.log('Initializing audio service...');
      this.recorder = new AudioRecorder(async (audioBlob) => {
        try {
          await this.processAudio(audioBlob);
        } catch (error) {
          console.error('Error processing audio:', error);
          toast.error('Error processing audio');
        }
      });

      this.isInitialized = true;
      console.log('Audio service initialized successfully');
      return true;
    } catch (error) {
      console.error('Error initializing audio service:', error);
      return false;
    }
  }

  async startRecording() {
    if (!this.recorder) {
      console.error('Audio service not initialized');
      throw new Error('Audio service not initialized');
    }
    
    try {
      await this.recorder.start();
      console.log('Started recording');
    } catch (error) {
      console.error('Error starting recording:', error);
      throw error;
    }
  }

  async stopRecording() {
    if (!this.recorder) {
      console.error('Audio service not initialized');
      return;
    }
    
    try {
      await this.recorder.stop();
      console.log('Stopped recording');
    } catch (error) {
      console.error('Error stopping recording:', error);
      toast.error('Error stopping recording');
    }
  }

  private async processAudio(audioBlob: Blob) {
    try {
      console.log('Processing audio...', { blobSize: audioBlob.size });
      const transcribedText = await this.transcriptionService.transcribeAudio(audioBlob);
      console.log('Transcription completed:', transcribedText);
      return transcribedText;
    } catch (error) {
      console.error('Error processing audio:', error);
      toast.error('Error processing audio');
      throw error;
    }
  }

  cleanup() {
    if (this.recorder) {
      this.recorder.stop();
      this.recorder = null;
    }
    this.isInitialized = false;
  }
}