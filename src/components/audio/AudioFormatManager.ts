export class AudioFormatManager {
  static getSupportedMimeType(): string {
    const isIOS = [
      'iPad Simulator',
      'iPhone Simulator',
      'iPod Simulator',
      'iPad',
      'iPhone',
      'iPod'
    ].includes(navigator.platform)
    || (navigator.userAgent.includes("Mac") && "ontouchend" in document);

    // Log available MIME types for debugging
    console.log('Checking MIME type support...');
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

    // For iOS devices
    if (isIOS) {
      if (MediaRecorder.isTypeSupported('audio/wav')) {
        console.log('Using WAV format for iOS');
        return 'audio/wav';
      }
      if (MediaRecorder.isTypeSupported('audio/mp4')) {
        console.log('Using MP4 format for iOS');
        return 'audio/mp4';
      }
    }

    // For other devices, prefer WebM
    if (MediaRecorder.isTypeSupported('audio/webm')) {
      console.log('Using WebM format');
      return 'audio/webm';
    }

    // Fallback options
    const fallbackTypes = ['audio/wav', 'audio/mp4', 'audio/ogg'];
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