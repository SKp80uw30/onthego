export class AudioStateManager {
  private initialized: boolean = false;
  private transcriptionCallback: ((text: string) => void) | null = null;

  setInitialized(value: boolean) {
    this.initialized = value;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  setTranscriptionCallback(callback: (text: string) => void) {
    this.transcriptionCallback = callback;
  }

  getTranscriptionCallback(): ((text: string) => void) | null {
    return this.transcriptionCallback;
  }

  reset() {
    this.initialized = false;
    this.transcriptionCallback = null;
  }
}