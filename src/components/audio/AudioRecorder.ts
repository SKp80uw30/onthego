export class AudioRecorder {
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private worklet: AudioWorkletNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;

  constructor(private onAudioData: (audioData: Float32Array) => void) {}

  async start() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      this.audioContext = new AudioContext({
        sampleRate: 24000,
      });

      // Load and register the audio worklet
      await this.audioContext.audioWorklet.addModule('/src/components/audio/processor.js');
      
      this.source = this.audioContext.createMediaStreamSource(this.stream);
      this.worklet = new AudioWorkletNode(this.audioContext, 'audio-processor');
      
      this.worklet.port.onmessage = (event) => {
        if (event.data.type === 'audio-data') {
          this.onAudioData(event.data.audioData);
        }
      };

      this.source.connect(this.worklet);
      this.worklet.connect(this.audioContext.destination);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      throw error;
    }
  }

  stop() {
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
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}