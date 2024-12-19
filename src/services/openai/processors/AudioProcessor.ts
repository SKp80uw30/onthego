import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { OpenAIState } from "../OpenAIState";

export class AudioProcessor {
  constructor(private state: OpenAIState) {}

  async processTranscription(audioBlob: Blob): Promise<string | null> {
    try {
      if (!this.state.isInitialized()) {
        console.error('OpenAI service not initialized');
        toast.error('Service not ready yet. Please try again in a moment.');
        return null;
      }

      const currentSlackId = this.state.getSlackAccountId();
      if (!currentSlackId) {
        console.error('No Slack account selected');
        toast.error('No Slack account selected');
        return null;
      }

      const formData = new FormData();
      formData.append('file', new Blob([audioBlob], { type: 'audio/webm' }), 'audio.webm');

      const { data: transcriptionResponse, error: transcriptionError } = await supabase.functions.invoke('process-audio', {
        body: formData,
      });

      if (transcriptionError || !transcriptionResponse) {
        console.error('Transcription error:', transcriptionError || 'No response data');
        toast.error('Error transcribing audio. Please try again.');
        return null;
      }

      if (!transcriptionResponse.text) {
        console.error('No transcription text in response:', transcriptionResponse);
        toast.error('Could not transcribe audio. Please try again.');
        return null;
      }

      console.log(`[AudioProcessor] Transcription completed:`, transcriptionResponse.text);
      return transcriptionResponse.text;
    } catch (error) {
      console.error(`[AudioProcessor] Error:`, error);
      throw error;
    }
  }
}