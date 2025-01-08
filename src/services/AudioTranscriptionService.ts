import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { blobToBase64 } from "@/utils/audio-utils";

export class AudioTranscriptionService {
  async transcribeAudio(audioBlob: Blob): Promise<string> {
    try {
      console.log('Starting transcription of audio:', {
        type: audioBlob.type,
        size: audioBlob.size
      });

      // Convert blob to base64
      const base64Audio = await blobToBase64(audioBlob);
      console.log('Audio converted to base64, length:', base64Audio.length);

      console.log('Sending request to process-audio function...');
      const { data: transcriptionData, error: transcriptionError } = await supabase.functions.invoke('process-audio', {
        body: { 
          audio: base64Audio,
          mimeType: audioBlob.type
        }
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