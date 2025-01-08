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
      // First try the Permissions API
      if ('permissions' in navigator) {
        const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        if (permissionStatus.state === 'denied') {
          throw new Error('Microphone access is blocked. Please enable it in your browser settings.');
        }
      }

      // On iOS Safari, we need to try to access the microphone first
      if (this.isIOSDevice()) {
        await this.requestIOSPermission();
      }

      return true;
    } catch (error) {
      console.error('Permission check failed:', error);
      if (this.isIOSDevice()) {
        throw new Error('On iOS, please ensure microphone access is enabled in Settings > Safari > Microphone');
      }
      throw error;
    }
  }

  private isIOSDevice(): boolean {
    return [
      'iPad Simulator',
      'iPhone Simulator',
      'iPod Simulator',
      'iPad',
      'iPhone',
      'iPod'
    ].includes(navigator.platform)
    || (navigator.userAgent.includes("Mac") && "ontouchend" in document);
  }

  private async requestIOSPermission(): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    // iOS requires user interaction to start AudioContext
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    // Request microphone access
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(track => track.stop()); // Stop the test stream immediately
  }

  async start() {
    if (this.isRecording) {
      console.log('AudioRecorder is already recording');
      return;
    }

    try {
      await this.checkPermissions();

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

      // Initialize AudioContext if needed
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        if (this.audioContext.state === 'suspended') {
          await this.audioContext.resume();
        }
      }

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

    throw new Error('No supported audio MIME type found on this device');
  }

  private getReadableErrorMessage(error: any): string {
    if (this.isIOSDevice()) {
      if (error.name === 'NotAllowedError') {
        return 'Microphone access was denied. On iOS, go to Settings > Safari > Microphone and ensure access is enabled for this website.';
      }
    }

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