export class AudioPermissions {
  static async checkPermissions(): Promise<boolean> {
    try {
      if ('permissions' in navigator) {
        const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        if (permissionStatus.state === 'denied') {
          throw new Error('Microphone access is blocked. Please enable it in your browser settings.');
        }
      }

      if (AudioPermissions.isIOSDevice()) {
        await AudioPermissions.requestIOSPermission();
      }

      return true;
    } catch (error) {
      console.error('Permission check failed:', error);
      if (AudioPermissions.isIOSDevice()) {
        throw new Error('On iOS, please ensure microphone access is enabled in Settings > Safari > Microphone');
      }
      throw error;
    }
  }

  static isIOSDevice(): boolean {
    return [
      'iPad Simulator',
      'iPhone Simulator',
      'iPod Simulator',
      'iPad',
      'iPhone',
      'iPod'
    ].includes(navigator.platform)
    || (navigator.userAgent.includes("Mac") && "ontouchend" in document);
  }

  private static async requestIOSPermission(): Promise<void> {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(track => track.stop());
  }
}