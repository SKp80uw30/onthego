class AudioProcessor extends AudioWorkletProcessor {
  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (input.length > 0) {
      const audioData = input[0];
      this.port.postMessage({
        type: 'audio-data',
        audioData: new Float32Array(audioData)
      });
    }
    return true;
  }
}

registerProcessor('audio-processor', AudioProcessor);