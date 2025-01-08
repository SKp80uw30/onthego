export class AudioFormatManager {
  static getSupportedMimeType(): string {
    console.log('[AudioFormatManager] Checking available MIME types...');
    
    // Log all available MIME types for debugging
    const mimeTypes = [
      'audio/webm',
      'audio/webm;codecs=opus',
      'audio/ogg;codecs=opus',
      'audio/wav',
      'audio/mp3',
      'audio/mp4',
      'audio/mpeg'
    ];

    mimeTypes.forEach(type => {
      const isSupported = MediaRecorder.isTypeSupported(type);
      console.log(`[AudioFormatManager] ${type}: ${isSupported}`);
    });

    // Try formats in order of preference for Whisper API compatibility
    if (MediaRecorder.isTypeSupported('audio/mp3')) {
      console.log('[AudioFormatManager] Selected: audio/mp3');
      return 'audio/mp3';
    }
    
    if (MediaRecorder.isTypeSupported('audio/wav')) {
      console.log('[AudioFormatManager] Selected: audio/wav');
      return 'audio/wav';
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
      size: blob.size,
      lastModified: blob instanceof File ? blob.lastModified : 'N/A'
    });

    if (blob.size === 0) {
      console.error('[AudioFormatManager] Audio blob is empty');
      return false;
    }

    // Verify the MIME type matches what Whisper expects
    const supportedTypes = [
      'audio/webm',
      'audio/ogg',
      'audio/wav',
      'audio/mp3',
      'audio/mp4',
      'audio/mpeg'
    ];

    const baseType = blob.type.split(';')[0]; // Remove codec info for comparison
    const isSupported = supportedTypes.includes(baseType);
    
    if (!isSupported) {
      console.error('[AudioFormatManager] Unsupported audio format:', blob.type);
      console.log('[AudioFormatManager] Supported formats:', supportedTypes);
      return false;
    }

    return true;
  }
}