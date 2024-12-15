import { AudioRecorderManager } from './AudioRecorderManager';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export class AudioService {
  private recorderManager: AudioRecorderManager;

  constructor() {
    this.recorderManager = new AudioRecorderManager();
  }

  async initialize(): Promise<void> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }
      await this.recorderManager.initialize(session);
    } catch (error) {
      console.error('Error initializing audio service:', error);
      throw error;
    }
  }

  async startRecording(): Promise<void> {
    try {
      await this.recorderManager.startRecording();
    } catch (error) {
      console.error('Error starting recording:', error);
      throw error;
    }
  }

  stopRecording(): void {
    this.recorderManager.stopRecording();
  }

  cleanup(): void {
    this.recorderManager.cleanup();
  }
}