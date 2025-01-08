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

  constructor(onDataAvailable?: (blob: Blob) => void) {
    this.onDataAvailable = onDataAvailable || null;
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
          sampleRate: 44100,
          channelCount: 1
        } 
      });

      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        if (this.audioContext.state === 'suspended') {
          await this.audioContext.resume();
        }
      }

      console.log('Creating media recorder...');
      const mimeType = AudioFormatManager.getSupportedMimeType();
      console.log('Selected MIME type:', mimeType);
      
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: mimeType
      });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          console.log('Received audio chunk:', event.data.size, 'bytes');
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        console.log('MediaRecorder stopped, processing chunks...');
        const audioBlob = new Blob(this.audioChunks, { type: mimeType });
        console.log('Final audio blob:', audioBlob.size, 'bytes, type:', audioBlob.type);
        this.onDataAvailable?.(audioBlob);
        this.audioChunks = [];
      };

      this.mediaRecorder.start(500); // Collect data more frequently on mobile
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

  setOnDataAvailable(callback: (blob: Blob) => void) {
    this.onDataAvailable = callback;
  }
}