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
      console.log('Requesting microphone access...');
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });

      console.log('Creating media recorder...');
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: 'audio/webm'
      });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        this.onDataAvailable?.(audioBlob);
        this.audioChunks = [];
      };

      this.mediaRecorder.start();
      this.isRecording = true;
      console.log('Recording started successfully');
    } catch (error) {
      console.error('Error starting recording:', error);
      await this.cleanup();
      throw error;
    }
  }

  async stop() {
    console.log('Stopping recording...');
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.isRecording = false;
      await this.cleanup();
      console.log('Recording stopped successfully');
    }
  }

  private async cleanup() {
    console.log('Cleaning up audio recorder...');
    
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    if (this.mediaRecorder) {
      if (this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop();
      }
      this.mediaRecorder = null;
    }

    this.audioChunks = [];
    this.isRecording = false;
  }
}