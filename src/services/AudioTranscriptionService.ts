import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AudioFormatManager } from "@/components/audio/AudioFormatManager";

export class AudioTranscriptionService {
  async transcribeAudio(audioBlob: Blob): Promise<string> {
    try {
      console.log('AudioTranscriptionService: Starting transcription...', { 
        originalType: audioBlob.type,
        originalSize: audioBlob.size 
      });

      // Validate the audio blob
      const isValid = await AudioFormatManager.validateAudioBlob(audioBlob);
      if (!isValid) {
        throw new Error('Invalid audio data received');
      }

      // Create FormData with the audio
      const formData = new FormData();
      const filename = `audio.${audioBlob.type.split('/')[1]}`;
      formData.append('file', audioBlob, filename);

      console.log('AudioTranscriptionService: Sending request to process-audio function...');
      const { data: transcriptionData, error: transcriptionError } = await supabase.functions.invoke('process-audio', {
        body: formData,
      });

      if (transcriptionError) {
        console.error('AudioTranscriptionService: Transcription error:', transcriptionError);
        toast.error('Error transcribing audio');
        throw new Error(`Error transcribing audio: ${transcriptionError.message}`);
      }

      if (!transcriptionData || !transcriptionData.text) {
        console.error('AudioTranscriptionService: No transcription data received');
        toast.error('No transcription data received');
        throw new Error('No transcription data received');
      }

      console.log('AudioTranscriptionService: Transcription successful:', transcriptionData.text);
      return transcriptionData.text;
    } catch (error) {
      console.error('Error in transcription service:', error);
      toast.error('Error transcribing audio');
      throw error;
    }
  }
}