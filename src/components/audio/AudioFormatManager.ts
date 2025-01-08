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

    // For iOS devices, we'll use mp4 format which is better supported
    if (isIOS) {
      const iOSMimeTypes = [
        'audio/mp4',
        'audio/mpeg',
        'audio/wav'
      ];
      
      for (const mimeType of iOSMimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          console.log('Using iOS-compatible MIME type:', mimeType);
          return mimeType;
        }
      }
    }

    // For other devices, prioritize formats known to work well with OpenAI's Whisper API
    const mimeTypes = [
      'audio/mp4',
      'audio/mpeg',
      'audio/wav',
      'audio/webm;codecs=opus',
      'audio/ogg;codecs=opus'
    ];

    for (const mimeType of mimeTypes) {
      if (MediaRecorder.isTypeSupported(mimeType)) {
        console.log('Using standard MIME type:', mimeType);
        return mimeType;
      }
    }

    throw new Error('No supported audio MIME type found on this device');
  }
}