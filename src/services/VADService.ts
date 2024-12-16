import { MicVAD } from '@ricky0123/vad-web';
import { toast } from 'sonner';

export class VADService {
  private vad: MicVAD | null = null;
  private onSpeechStart?: () => void;
  private onSpeechEnd?: () => void;
  private isInitialized = false;

  async initialize(onSpeechStart: () => void, onSpeechEnd: () => void) {
    try {
      this.onSpeechStart = onSpeechStart;
      this.onSpeechEnd = onSpeechEnd;

      this.vad = await MicVAD.new({
        onSpeechStart: () => {
          console.log('Speech detected');
          this.onSpeechStart?.();
        },
        onSpeechEnd: () => {
          console.log('Speech ended');
          this.onSpeechEnd?.();
        },
        onVADMisfire: () => {
          console.log('VAD misfire');
        },
      });

      this.isInitialized = true;
    } catch (error) {
      console.error('Error initializing VAD:', error);
      toast.error('Failed to initialize voice detection');
      throw error;
    }
  }

  async start() {
    if (!this.isInitialized) {
      throw new Error('VAD not initialized');
    }
    
    try {
      await this.vad?.start();
      toast.success('Listening for speech...');
    } catch (error) {
      console.error('Error starting VAD:', error);
      toast.error('Failed to start voice detection');
      throw error;
    }
  }

  stop() {
    if (this.vad) {
      // The MicVAD instance has a pause() method we can use to stop listening
      this.vad.pause();
      this.vad = null;
      this.isInitialized = false;
    }
  }

  isRunning() {
    return this.isInitialized;
  }
}