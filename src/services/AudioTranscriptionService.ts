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
        const errorMessage = transcriptionError.message || 'Unknown error occurred';
        throw new Error(`Error transcribing audio: ${errorMessage}`);
      }

      if (!transcriptionData || !transcriptionData.text) {
        console.error('No transcription data received:', transcriptionData);
        throw new Error('No transcription data received');
      }

      console.log('Transcription successful:', transcriptionData.text);
      return transcriptionData.text;
    } catch (error) {
      console.error('Error in transcription service:', error);
      
      // More specific error messages based on the error type
      if (error.message?.includes('OpenAI API')) {
        toast.error('Error connecting to transcription service. Please try again.');
      } else if (error.message?.includes('No audio data')) {
        toast.error('No audio data received. Please try recording again.');
      } else {
        toast.error('Error transcribing audio. Please try again.');
      }
      
      throw error;
    }
  }
}