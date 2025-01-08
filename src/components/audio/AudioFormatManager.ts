export class AudioFormatManager {
  static getSupportedMimeType(): string {
    console.log('Checking MIME type support...');
    
    // We specifically want webm for Whisper API compatibility
    if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
      console.log('Using WebM with Opus codec');
      return 'audio/webm;codecs=opus';
    }
    
    if (MediaRecorder.isTypeSupported('audio/webm')) {
      console.log('Using WebM format');
      return 'audio/webm';
    }

    // Log available MIME types for debugging
    const mimeTypes = [
      'audio/webm',
      'audio/webm;codecs=opus',
      'audio/wav',
      'audio/mp4',
      'audio/ogg'
    ];

    mimeTypes.forEach(type => {
      console.log(`${type}: ${MediaRecorder.isTypeSupported(type)}`);
    });

    // Only allow formats we know work well with Whisper API
    const fallbackTypes = ['audio/ogg;codecs=opus'];
    for (const type of fallbackTypes) {
      if (MediaRecorder.isTypeSupported(type)) {
        console.log(`Using fallback format: ${type}`);
        return type;
      }
    }

    throw new Error('No supported audio MIME type found on this device');
  }

  static async validateAudioBlob(blob: Blob): Promise<boolean> {
    console.log('Validating audio blob:', {
      type: blob.type,
      size: blob.size
    });

    if (blob.size === 0) {
      console.error('Audio blob is empty');
      return false;
    }

    // Verify the MIME type is one we support
    const supportedTypes = [
      'audio/webm',
      'audio/webm;codecs=opus',
      'audio/ogg;codecs=opus'
    ];

    if (!supportedTypes.includes(blob.type)) {
      console.error('Unsupported audio format:', blob.type);
      return false;
    }

    return true;
  }
}