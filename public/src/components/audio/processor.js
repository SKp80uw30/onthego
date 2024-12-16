class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (input.length > 0) {
      const audioData = input[0];
      this.port.postMessage({
        type: 'audio-data',
        audioData: Array.from(audioData)  // Convert to regular array for transfer
      });
    }
    return true;
  }
}

registerProcessor('audio-processor', AudioProcessor);