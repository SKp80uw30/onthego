export class AudioFormatManager {
  static getSupportedMimeType(): string {
    console.log('Checking MIME type support...');
    
    // Default to webm which we know works well with Whisper API
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

    // Fallback options if webm isn't supported
    const fallbackTypes = ['audio/ogg', 'audio/mp4'];
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

    return true;
  }
}