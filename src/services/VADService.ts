import { MicVAD } from '@ricky0123/vad-web';
import { toast } from 'sonner';

export class VADService {
  private vad: MicVAD | null = null;
  private onSpeechStart?: () => void;
  private onSpeechEnd?: () => void;
  private isInitialized = false;

  async initialize(onSpeechStart: () => void, onSpeechEnd: () => void) {
    try {
      console.log('Initializing VAD service...');
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
          console.log('VAD misfire detected');
        },
        onError: (error) => {
          console.error('VAD error:', error);
          toast.error('Voice detection error occurred');
        },
      });

      this.isInitialized = true;
      console.log('VAD service initialized successfully');
    } catch (error) {
      console.error('Error initializing VAD:', error);
      toast.error('Failed to initialize voice detection');
      throw error;
    }
  }

  async start() {
    if (!this.isInitialized) {
      const error = new Error('VAD not initialized');
      console.error(error);
      throw error;
    }
    
    try {
      console.log('Starting VAD service...');
      await this.vad?.start();
      toast.success('Listening for speech...');
      console.log('VAD service started successfully');
    } catch (error) {
      console.error('Error starting VAD:', error);
      toast.error('Failed to start voice detection');
      throw error;
    }
  }

  stop() {
    try {
      console.log('Stopping VAD service...');
      if (this.vad) {
        this.vad.pause();
        this.vad = null;
        this.isInitialized = false;
        console.log('VAD service stopped successfully');
      }
    } catch (error) {
      console.error('Error stopping VAD:', error);
      toast.error('Error stopping voice detection');
    }
  }

  isRunning() {
    return this.isInitialized;
  }
}