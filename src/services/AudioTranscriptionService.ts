import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AudioFormatConverter } from "./audio/AudioFormatConverter";

export class AudioTranscriptionService {
  async transcribeAudio(audioBlob: Blob): Promise<string> {
    try {
      console.log('AudioTranscriptionService: Starting transcription...', { 
        originalType: audioBlob.type,
        originalSize: audioBlob.size 
      });
      
      // Convert audio to WAV format for maximum compatibility
      const wavBlob = await AudioFormatConverter.convertToWAV(audioBlob);
      
      // Create FormData with the converted audio
      const formData = new FormData();
      formData.append('file', wavBlob, 'audio.wav');

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