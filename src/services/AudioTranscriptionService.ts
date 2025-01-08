import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export class AudioTranscriptionService {
  async transcribeAudio(audioBlob: Blob): Promise<string> {
    try {
      console.log('Starting transcription of audio:', {
        type: audioBlob.type,
        size: audioBlob.size
      });

      // Create FormData with the audio
      const formData = new FormData();
      formData.append('file', audioBlob);

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
}