export class AudioFormatManager {
  static getSupportedMimeType(): string {
    console.log('[AudioFormatManager] Checking available MIME types...');
    
    // Log all available MIME types for debugging
    const mimeTypes = [
      'audio/webm',
      'audio/webm;codecs=opus',
      'audio/ogg;codecs=opus',
      'audio/wav',
      'audio/mp4'
    ];

    mimeTypes.forEach(type => {
      console.log(`[AudioFormatManager] ${type}: ${MediaRecorder.isTypeSupported(type)}`);
    });

    // Prioritize WebM with Opus as it's best supported by Whisper API
    if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
      console.log('[AudioFormatManager] Selected: audio/webm;codecs=opus');
      return 'audio/webm;codecs=opus';
    }
    
    if (MediaRecorder.isTypeSupported('audio/webm')) {
      console.log('[AudioFormatManager] Selected: audio/webm');
      return 'audio/webm';
    }

    if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
      console.log('[AudioFormatManager] Selected: audio/ogg;codecs=opus');
      return 'audio/ogg;codecs=opus';
    }

    console.error('[AudioFormatManager] No supported audio format found');
    throw new Error('No supported audio format found on this device');
  }

  static async validateAudioBlob(blob: Blob): Promise<boolean> {
    console.log('[AudioFormatManager] Validating audio blob:', {
      type: blob.type,
      size: blob.size
    });

    if (blob.size === 0) {
      console.error('[AudioFormatManager] Audio blob is empty');
      return false;
    }

    // Verify the MIME type matches what Whisper expects
    const supportedTypes = [
      'audio/webm',
      'audio/webm;codecs=opus',
      'audio/ogg;codecs=opus'
    ];

    if (!supportedTypes.includes(blob.type)) {
      console.error('[AudioFormatManager] Unsupported audio format:', blob.type);
      return false;
    }

    return true;
  }
}