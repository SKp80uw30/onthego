import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AudioFormatManager } from "@/components/audio/AudioFormatManager";

export class AudioTranscriptionService {
  async transcribeAudio(audioBlob: Blob): Promise<string> {
    try {
      console.log('Starting transcription of audio:', {
        type: audioBlob.type,
        size: audioBlob.size
      });

      // Validate the audio blob
      const isValid = await AudioFormatManager.validateAudioBlob(audioBlob);
      if (!isValid) {
        throw new Error('Invalid audio data received');
      }

      // Create FormData with the audio
      const formData = new FormData();
      const filename = `audio${this.getFileExtension(audioBlob.type)}`;
      formData.append('file', audioBlob, filename);

      console.log('Sending request to process-audio function...');
      const { data: transcriptionData, error: transcriptionError } = await supabase.functions.invoke('process-audio', {
        body: formData,
      });

      if (transcriptionError) {
        console.error('Transcription error:', transcriptionError);
        throw new Error(`Error transcribing audio: ${transcriptionError.message}`);
      }

      if (!transcriptionData || !transcriptionData.text) {
        console.error('No transcription data received');
        throw new Error('No transcription data received');
      }

      console.log('Transcription successful:', transcriptionData.text);
      return transcriptionData.text;
    } catch (error) {
      console.error('Error in transcription service:', error);
      toast.error('Error transcribing audio');
      throw error;
    }
  }

  private getFileExtension(mimeType: string): string {
    switch (mimeType) {
      case 'audio/webm':
        return '.webm';
      case 'audio/wav':
        return '.wav';
      case 'audio/mp4':
        return '.mp4';
      case 'audio/ogg':
        return '.ogg';
      default:
        return '.webm';
    }
  }
}