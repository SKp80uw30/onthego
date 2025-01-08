import { AudioPermissions } from './AudioPermissions';
import { AudioFormatManager } from './AudioFormatManager';
import { AudioErrorHandler } from './AudioErrorHandler';

export class AudioRecorder {
  private audioContext: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private isRecording = false;
  private onDataAvailable: ((blob: Blob) => void) | null = null;
  private mimeType: string;

  constructor(onDataAvailable?: (blob: Blob) => void) {
    this.onDataAvailable = onDataAvailable || null;
    this.mimeType = AudioFormatManager.getSupportedMimeType();
    console.log('AudioRecorder initialized with MIME type:', this.mimeType);
  }

  async start() {
    if (this.isRecording) {
      console.log('AudioRecorder is already recording');
      return;
    }

    try {
      await AudioPermissions.checkPermissions();

      console.log('Requesting microphone access...');
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000, // Increased for better quality
          channelCount: 1
        } 
      });

      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
          sampleRate: 48000 // Match getUserMedia sampleRate
        });
        if (this.audioContext.state === 'suspended') {
          await this.audioContext.resume();
        }
      }

      console.log('Creating media recorder with MIME type:', this.mimeType);
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: this.mimeType,
        audioBitsPerSecond: 128000 // Consistent bitrate
      });

      this.mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          console.log('Received audio chunk:', event.data.size, 'bytes');
          if (await AudioFormatManager.validateAudioBlob(event.data)) {
            this.audioChunks.push(event.data);
          } else {
            console.error('Invalid audio chunk received');
          }
        }
      };

      this.mediaRecorder.onstop = async () => {
        console.log('MediaRecorder stopped, processing chunks...');
        const audioBlob = new Blob(this.audioChunks, { type: this.mimeType });
        console.log('Final audio blob:', audioBlob.size, 'bytes, type:', audioBlob.type);
        
        if (await AudioFormatManager.validateAudioBlob(audioBlob)) {
          this.onDataAvailable?.(audioBlob);
        } else {
          throw new Error('Invalid audio format produced');
        }
        this.audioChunks = [];
      };

      this.mediaRecorder.start(500); // Collect data every 500ms
      this.isRecording = true;
      console.log('Recording started successfully');
    } catch (error) {
      console.error('Error starting recording:', error);
      await this.cleanupResources();
      throw new Error(AudioErrorHandler.getReadableErrorMessage(error));
    }
  }

  async stop() {
    console.log('Stopping recording...');
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.isRecording = false;
      await this.cleanupResources();
      console.log('Recording stopped successfully');
    }
  }

  async cleanupResources() {
    console.log('Cleaning up audio recorder resources...');
    
    if (this.stream) {
      this.stream.getTracks().forEach(track => {
        track.stop();
        console.log('Audio track stopped');
      });
      this.stream = null;
    }

    if (this.mediaRecorder) {
      if (this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop();
        console.log('MediaRecorder stopped');
      }
      this.mediaRecorder = null;
    }

    if (this.audioContext) {
      await this.audioContext.close();
      console.log('AudioContext closed');
      this.audioContext = null;
    }

    this.audioChunks = [];
    this.isRecording = false;
    console.log('Audio recorder cleanup complete');
  }
}