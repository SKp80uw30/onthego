class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.isProcessing = true;
  }

  process(inputs, outputs, parameters) {
    if (!this.isProcessing) return false;
    
    const input = inputs[0];
    if (input && input.length > 0) {
      const audioData = input[0];
      if (audioData && audioData.length > 0) {
        this.port.postMessage({
          type: 'audio-data',
          audioData: Array.from(audioData)  // Convert to regular array for transfer
        });
      }
    }
    return true;
  }

  cleanup() {
    this.isProcessing = false;
  }
}

registerProcessor('audio-processor', AudioProcessor);