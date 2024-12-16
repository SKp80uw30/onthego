export class AudioRecorder {
  private audioContext: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private processor: AudioWorkletNode | null = null;
  private isInitialized = false;

  async start() {
    if (this.isInitialized) {
      console.log('AudioRecorder is already initialized');
      return;
    }

    try {
      console.log('Requesting microphone access...');
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      console.log('Creating audio context...');
      this.audioContext = new AudioContext();

      console.log('Loading audio worklet...');
      const workletUrl = new URL('/src/components/audio/processor.js', window.location.origin);
      await this.audioContext.audioWorklet.addModule(workletUrl.href);

      console.log('Creating media stream source...');
      this.source = this.audioContext.createMediaStreamSource(this.stream);

      console.log('Creating audio processor...');
      this.processor = new AudioWorkletNode(this.audioContext, 'audio-processor');

      this.source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);

      this.isInitialized = true;
      console.log('Audio recorder initialized successfully');
    } catch (error) {
      console.error('Error accessing microphone:', error);
      await this.cleanup();
      throw error;
    }
  }

  async stop() {
    console.log('Stopping recording...');
    await this.cleanup();
    console.log('Recording stopped successfully');
  }

  private async cleanup() {
    console.log('Cleaning up audio recorder...');
    
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }

    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    
    if (this.audioContext) {
      if (this.audioContext.state !== 'closed') {
        try {
          await this.audioContext.close();
        } catch (error) {
          console.error('Error closing audio context:', error);
        }
      }
      this.audioContext = null;
    }
    
    this.isInitialized = false;
  }
}