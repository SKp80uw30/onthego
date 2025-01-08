export class AudioErrorHandler {
  static getReadableErrorMessage(error: any): string {
    const isIOS = [
      'iPad Simulator',
      'iPhone Simulator',
      'iPod Simulator',
      'iPad',
      'iPhone',
      'iPod'
    ].includes(navigator.platform)
    || (navigator.userAgent.includes("Mac") && "ontouchend" in document);

    if (isIOS) {
      if (error.name === 'NotAllowedError') {
        return 'Microphone access was denied. On iOS, go to Settings > Safari > Microphone and ensure access is enabled for this website.';
      }
    }

    if (error.name === 'NotAllowedError') {
      return 'Microphone access was denied. Please allow microphone access and try again.';
    } else if (error.name === 'NotFoundError') {
      return 'No microphone found. Please ensure your device has a working microphone.';
    } else if (error.name === 'NotReadableError') {
      return 'Could not access your microphone. Please ensure no other app is using it.';
    }
    return `Failed to start recording: ${error.message || 'Unknown error'}`;
  }
}