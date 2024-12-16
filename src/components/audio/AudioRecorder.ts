export class AudioRecorder {
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private worklet: AudioWorkletNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private isInitialized = false;
  private isRecording = false;

  constructor(private onAudioData: (audioData: Float32Array) => void) {}

  async start() {
    try {
      if (this.isRecording) {
        console.warn('AudioRecorder is already recording');
        return;
      }

      if (!this.isInitialized) {
        console.log('Requesting microphone access...');
        this.stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            sampleRate: 24000,
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });

        console.log('Creating audio context...');
        this.audioContext = new AudioContext({
          sampleRate: 24000,
        });

        // Ensure audio context is in running state
        if (this.audioContext.state === 'suspended') {
          await this.audioContext.resume();
        }

        console.log('Loading audio worklet...');
        const workletUrl = new URL('/src/components/audio/processor.js', window.location.origin);
        await this.audioContext.audioWorklet.addModule(workletUrl.href);
        
        console.log('Creating media stream source...');
        this.source = this.audioContext.createMediaStreamSource(this.stream);
        this.worklet = new AudioWorkletNode(this.audioContext, 'audio-processor', {
          numberOfInputs: 1,
          numberOfOutputs: 1,
          channelCount: 1,
        });
        
        this.worklet.port.onmessage = (event) => {
          if (event.data.type === 'audio-data') {
            this.onAudioData(new Float32Array(event.data.audioData));
          }
        };

        this.source.connect(this.worklet);
        this.worklet.connect(this.audioContext.destination);
        this.isInitialized = true;
        console.log('Audio recorder initialized successfully');
      }

      this.isRecording = true;
      console.log('Recording started successfully');
    } catch (error) {
      console.error('Error accessing microphone:', error);
      await this.cleanup();
      throw error;
    }
  }

  private async cleanup() {
    console.log('Cleaning up audio recorder...');
    this.isRecording = false;
    
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    
    if (this.worklet) {
      this.worklet.disconnect();
      this.worklet = null;
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
    console.log('Recording stopped successfully');
  }

  async stop() {
    console.log('Stopping recording...');
    await this.cleanup();
  }
}