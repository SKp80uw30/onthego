import { AudioTranscriptionService } from '../AudioTranscriptionService';
import { toast } from 'sonner';
import { AudioStateManager } from './AudioStateManager';

export class AudioProcessor {
  constructor(
    private transcriptionService: AudioTranscriptionService,
    private stateManager: AudioStateManager
  ) {}

  async processAudioBlob(audioBlob: Blob) {
    console.log('[AudioProcessor] Processing audio...', { blobSize: audioBlob.size });
    try {
      const transcribedText = await this.transcriptionService.transcribeAudio(audioBlob);
      const callback = this.stateManager.getTranscriptionCallback();
      
      if (transcribedText && callback) {
        callback(transcribedText);
      }
    } catch (error) {
      console.error('[AudioProcessor] Error processing audio:', error);
      if (error.message?.includes('Service Unavailable')) {
        toast.error('Service temporarily unavailable. Please try again in a moment.');
      } else {
        toast.error('Error processing audio. Please try again.');
      }
      throw error;
    }
  }
}