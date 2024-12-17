import { AudioRecorder } from "@/components/audio/AudioRecorder";
import { OpenAIService } from "./OpenAIService";
import { toast } from "sonner";

export class AudioService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private isRecording: boolean = false;
  private openAIService: OpenAIService;

  constructor() {
    this.openAIService = new OpenAIService();
  }

  async initialize() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream);
      
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        try {
          await this.processAudio(audioBlob);
        } catch (error) {
          console.error('Error processing audio:', error);
          toast.error('Error processing audio');
        }
        this.audioChunks = [];
      };

      console.log('Audio service initialized successfully');
      return true;
    } catch (error) {
      console.error('Error initializing audio service:', error);
      return false;
    }
  }

  startRecording() {
    if (!this.mediaRecorder || this.isRecording) return;
    
    try {
      this.mediaRecorder.start();
      this.isRecording = true;
      console.log('Started recording');
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  }

  stopRecording() {
    if (!this.mediaRecorder || !this.isRecording) return;
    
    try {
      this.mediaRecorder.stop();
      this.isRecording = false;
      console.log('Stopped recording');
    } catch (error) {
      console.error('Error stopping recording:', error);
    }
  }

  private async processAudio(audioBlob: Blob) {
    try {
      console.log('Processing audio chunk...');
      await this.openAIService.processAudioChunk(audioBlob);
    } catch (error) {
      console.error('Error processing audio:', error);
      toast.error('Error processing audio');
      throw error;
    }
  }

  cleanup() {
    if (this.mediaRecorder) {
      if (this.isRecording) {
        this.mediaRecorder.stop();
      }
      this.mediaRecorder = null;
    }
    this.audioChunks = [];
    this.isRecording = false;
    this.openAIService.cleanup();
  }
}