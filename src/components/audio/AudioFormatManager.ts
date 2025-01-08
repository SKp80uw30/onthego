export class AudioFormatManager {
  static getSupportedMimeType(): string {
    console.log('Available MIME types:', MediaRecorder.isTypeSupported);
    
    const isIOS = [
      'iPad Simulator',
      'iPhone Simulator',
      'iPod Simulator',
      'iPad',
      'iPhone',
      'iPod'
    ].includes(navigator.platform)
    || (navigator.userAgent.includes("Mac") && "ontouchend" in document);

    // For iOS devices, prioritize formats known to work well
    if (isIOS) {
      const iOSMimeTypes = [
        'audio/wav',
        'audio/webm',
        'audio/webm;codecs=opus',
        'audio/mp4',
        'audio/mpeg'
      ];
      
      for (const mimeType of iOSMimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          console.log('Using iOS-compatible MIME type:', mimeType);
          return mimeType;
        }
      }
    }

    // For other devices, prioritize WebM with Opus codec
    const mimeTypes = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/wav',
      'audio/ogg;codecs=opus',
      'audio/mp4',
      'audio/mpeg'
    ];

    for (const mimeType of mimeTypes) {
      if (MediaRecorder.isTypeSupported(mimeType)) {
        console.log('Using standard MIME type:', mimeType);
        return mimeType;
      }
    }

    throw new Error('No supported audio MIME type found on this device');
  }

  static async validateAudioBlob(blob: Blob): Promise<boolean> {
    try {
      const arrayBuffer = await blob.arrayBuffer();
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      await audioContext.decodeAudioData(arrayBuffer);
      audioContext.close();
      return true;
    } catch (error) {
      console.error('Audio validation failed:', error);
      return false;
    }
  }
}