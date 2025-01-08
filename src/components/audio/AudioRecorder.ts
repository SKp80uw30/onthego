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
    console.log('[AudioRecorder] Initialized with MIME type:', this.mimeType);
  }

  async start() {
    if (this.isRecording) {
      console.log('[AudioRecorder] Already recording');
      return;
    }

    try {
      await AudioPermissions.checkPermissions();

      console.log('[AudioRecorder] Requesting microphone access...');
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1
        } 
      });

      // Log the actual constraints being used
      const tracks = this.stream.getAudioTracks();
      const settings = tracks[0].getSettings();
      console.log('[AudioRecorder] Actual audio settings:', settings);

      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        console.log('[AudioRecorder] Created AudioContext with sample rate:', this.audioContext.sampleRate);
        
        if (this.audioContext.state === 'suspended') {
          await this.audioContext.resume();
        }
      }

      console.log('[AudioRecorder] Creating MediaRecorder with MIME type:', this.mimeType);
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: this.mimeType
      });

      this.mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          console.log('[AudioRecorder] Received audio chunk:', {
            size: event.data.size,
            type: event.data.type,
            timestamp: new Date().toISOString()
          });

          if (await AudioFormatManager.validateAudioBlob(event.data)) {
            this.audioChunks.push(event.data);
          } else {
            console.error('[AudioRecorder] Invalid audio chunk received');
          }
        }
      };

      this.mediaRecorder.onstop = async () => {
        console.log('[AudioRecorder] MediaRecorder stopped, processing chunks...');
        const audioBlob = new Blob(this.audioChunks, { type: this.mimeType });
        console.log('[AudioRecorder] Final audio blob:', {
          size: audioBlob.size,
          type: audioBlob.type,
          chunksCount: this.audioChunks.length
        });
        
        if (await AudioFormatManager.validateAudioBlob(audioBlob)) {
          this.onDataAvailable?.(audioBlob);
        } else {
          throw new Error('Invalid audio format produced');
        }
        this.audioChunks = [];
      };

      this.mediaRecorder.start(1000); // Collect data every second for more granular logging
      this.isRecording = true;
      console.log('[AudioRecorder] Recording started successfully');
    } catch (error) {
      console.error('[AudioRecorder] Error starting recording:', error);
      await this.cleanupResources();
      throw new Error(AudioErrorHandler.getReadableErrorMessage(error));
    }
  }

  async stop() {
    console.log('[AudioRecorder] Stopping recording...');
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.isRecording = false;
      await this.cleanupResources();
      console.log('[AudioRecorder] Recording stopped successfully');
    }
  }

  async cleanupResources() {
    console.log('[AudioRecorder] Cleaning up resources...');
    
    if (this.stream) {
      this.stream.getTracks().forEach(track => {
        track.stop();
        console.log('[AudioRecorder] Audio track stopped');
      });
      this.stream = null;
    }

    if (this.mediaRecorder) {
      if (this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop();
        console.log('[AudioRecorder] MediaRecorder stopped');
      }
      this.mediaRecorder = null;
    }

    if (this.audioContext) {
      await this.audioContext.close();
      console.log('[AudioRecorder] AudioContext closed');
      this.audioContext = null;
    }

    this.audioChunks = [];
    this.isRecording = false;
    console.log('[AudioRecorder] Cleanup complete');
  }
}