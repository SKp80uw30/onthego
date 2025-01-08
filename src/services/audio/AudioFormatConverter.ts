export class AudioFormatConverter {
  static async convertToWAV(audioBlob: Blob): Promise<Blob> {
    console.log('Converting audio format:', {
      originalType: audioBlob.type,
      originalSize: audioBlob.size
    });

    // If already WAV, return as-is
    if (audioBlob.type === 'audio/wav') {
      console.log('Audio already in WAV format');
      return audioBlob;
    }

    try {
      // Create audio context
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Convert blob to array buffer
      const arrayBuffer = await audioBlob.arrayBuffer();
      
      // Decode audio data
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      // Create offline context for rendering
      const offlineContext = new OfflineAudioContext(
        audioBuffer.numberOfChannels,
        audioBuffer.length,
        audioBuffer.sampleRate
      );
      
      // Create buffer source
      const source = offlineContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(offlineContext.destination);
      source.start();
      
      // Render audio
      const renderedBuffer = await offlineContext.startRendering();
      
      // Convert to WAV format
      const wavBlob = await this.audioBufferToWAV(renderedBuffer);
      
      console.log('Audio conversion completed:', {
        newType: wavBlob.type,
        newSize: wavBlob.size
      });
      
      return wavBlob;
    } catch (error) {
      console.error('Error converting audio format:', error);
      throw new Error(`Audio conversion failed: ${error.message}`);
    }
  }

  private static audioBufferToWAV(buffer: AudioBuffer): Promise<Blob> {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;
    
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;
    
    const data = this.interleaveChannels(buffer);
    const dataSize = data.length * bytesPerSample;
    const fileSize = 44 + dataSize;
    
    const arrayBuffer = new ArrayBuffer(fileSize);
    const dataView = new DataView(arrayBuffer);
    
    // WAV header
    this.writeWAVHeader(dataView, {
      fileSize,
      dataSize,
      numChannels,
      sampleRate,
      bitDepth,
      format
    });
    
    // Write audio data
    this.writeAudioData(dataView, data, bitDepth);
    
    return Promise.resolve(new Blob([arrayBuffer], { type: 'audio/wav' }));
  }

  private static interleaveChannels(buffer: AudioBuffer): Float32Array {
    const numChannels = buffer.numberOfChannels;
    const length = buffer.length * numChannels;
    const result = new Float32Array(length);
    
    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < buffer.length; i++) {
        result[i * numChannels + channel] = channelData[i];
      }
    }
    
    return result;
  }

  private static writeWAVHeader(
    dataView: DataView,
    {
      fileSize,
      dataSize,
      numChannels,
      sampleRate,
      bitDepth,
      format
    }: {
      fileSize: number;
      dataSize: number;
      numChannels: number;
      sampleRate: number;
      bitDepth: number;
      format: number;
    }
  ) {
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        dataView.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF'); // ChunkID
    dataView.setUint32(4, fileSize - 8, true); // ChunkSize
    writeString(8, 'WAVE'); // Format
    writeString(12, 'fmt '); // Subchunk1ID
    dataView.setUint32(16, 16, true); // Subchunk1Size
    dataView.setUint16(20, format, true); // AudioFormat
    dataView.setUint16(22, numChannels, true); // NumChannels
    dataView.setUint32(24, sampleRate, true); // SampleRate
    dataView.setUint32(28, sampleRate * numChannels * (bitDepth / 8), true); // ByteRate
    dataView.setUint16(32, numChannels * (bitDepth / 8), true); // BlockAlign
    dataView.setUint16(34, bitDepth, true); // BitsPerSample
    writeString(36, 'data'); // Subchunk2ID
    dataView.setUint32(40, dataSize, true); // Subchunk2Size
  }

  private static writeAudioData(dataView: DataView, data: Float32Array, bitDepth: number) {
    const offset = 44;
    const stride = bitDepth / 8;
    
    for (let i = 0; i < data.length; i++) {
      const sample = Math.max(-1, Math.min(1, data[i]));
      const value = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      dataView.setInt16(offset + i * stride, value, true);
    }
  }
}