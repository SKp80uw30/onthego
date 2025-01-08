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

  async checkPermissions(): Promise<boolean> {
    try {
      const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      return permissionStatus.state === 'granted';
    } catch (error) {
      console.log('Permissions API not supported, falling back to getUserMedia');
      return true; // Fall back to getUserMedia which will handle permissions
    }
  }

  async start() {
    if (this.isRecording) {
      console.log('AudioRecorder is already recording');
      return;
    }

    try {
      const hasPermission = await this.checkPermissions();
      if (!hasPermission) {
        throw new Error('Microphone permission not granted');
      }

      console.log('Requesting microphone access...');
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100, // Specify standard sample rate
          channelCount: 1    // Mono audio for better compatibility
        } 
      });

      // Create and initialize AudioContext first
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      await this.audioContext.resume(); // Important for iOS

      console.log('Creating media recorder...');
      const mimeType = this.getSupportedMimeType();
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: mimeType
      });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: mimeType });
        this.onDataAvailable?.(audioBlob);
        this.audioChunks = [];
      };

      this.mediaRecorder.start();
      this.isRecording = true;
      console.log('Recording started successfully');
    } catch (error) {
      console.error('Error starting recording:', error);
      await this.cleanupResources();
      throw new Error(this.getReadableErrorMessage(error));
    }
  }

  private getSupportedMimeType(): string {
    const mimeTypes = [
      'audio/webm',
      'audio/webm;codecs=opus',
      'audio/ogg;codecs=opus',
      'audio/mp4'
    ];

    for (const mimeType of mimeTypes) {
      if (MediaRecorder.isTypeSupported(mimeType)) {
        return mimeType;
      }
    }

    throw new Error('No supported audio MIME type found');
  }

  private getReadableErrorMessage(error: any): string {
    if (error.name === 'NotAllowedError') {
      return 'Microphone access was denied. Please allow microphone access and try again.';
    } else if (error.name === 'NotFoundError') {
      return 'No microphone found. Please ensure your device has a working microphone.';
    } else if (error.name === 'NotReadableError') {
      return 'Could not access your microphone. Please ensure no other app is using it.';
    }
    return `Failed to start recording: ${error.message || 'Unknown error'}`;
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

    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }

    this.audioChunks = [];
    this.isRecording = false;
  }

  setOnDataAvailable(callback: (blob: Blob) => void) {
    this.onDataAvailable = callback;
  }
}