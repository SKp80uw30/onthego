import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { blobToBase64 } from "@/utils/audio-utils";

export class AudioTranscriptionService {
  async transcribeAudio(audioBlob: Blob): Promise<string> {
    try {
      console.log('[AudioTranscriptionService] Starting transcription:', {
        blobType: audioBlob.type,
        blobSize: audioBlob.size
      });

      // Convert blob to base64
      const base64Audio = await blobToBase64(audioBlob);
      console.log('[AudioTranscriptionService] Audio converted to base64, length:', base64Audio.length);

      console.log('[AudioTranscriptionService] Sending request to process-audio function...');
      const { data: transcriptionData, error: transcriptionError } = await supabase.functions.invoke('process-audio', {
        body: { 
          audio: base64Audio,
          mimeType: audioBlob.type
        }
      });

      if (transcriptionError) {
        console.error('[AudioTranscriptionService] Transcription error:', transcriptionError);
        throw new Error(`Error transcribing audio: ${transcriptionError.message || 'Unknown error'}`);
      }

      if (!transcriptionData || !transcriptionData.text) {
        console.error('[AudioTranscriptionService] No transcription data received:', transcriptionData);
        throw new Error('No transcription data received');
      }

      console.log('[AudioTranscriptionService] Transcription successful:', transcriptionData.text);
      return transcriptionData.text;
    } catch (error) {
      console.error('[AudioTranscriptionService] Error in transcription service:', error);
      throw error;
    }
  }
}