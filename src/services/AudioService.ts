import { AudioRecorderManager } from './AudioRecorderManager';
import { VADService } from './VADService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export class AudioService {
  private recorderManager: AudioRecorderManager;
  private vadService: VADService;

  constructor() {
    this.recorderManager = new AudioRecorderManager();
    this.vadService = new VADService();
  }

  async initialize(): Promise<void> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }
      
      await this.recorderManager.initialize(session);
      
      await this.vadService.initialize(
        // Speech start handler
        async () => {
          console.log('Starting recording due to speech detection');
          await this.recorderManager.startRecording();
        },
        // Speech end handler
        () => {
          console.log('Stopping recording due to speech end');
          this.recorderManager.stopRecording();
        }
      );
    } catch (error) {
      console.error('Error initializing audio service:', error);
      throw error;
    }
  }

  async startListening(): Promise<void> {
    try {
      await this.vadService.start();
    } catch (error) {
      console.error('Error starting listening:', error);
      throw error;
    }
  }

  stopListening(): void {
    this.vadService.stop();
    this.recorderManager.stopRecording();
  }

  cleanup(): void {
    this.vadService.stop();
    this.recorderManager.cleanup();
  }

  isListening(): boolean {
    return this.vadService.isRunning();
  }
}