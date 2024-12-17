import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export class TextToSpeechService {
  private audioContext: AudioContext | null = null;

  async speakText(text: string): Promise<void> {
    try {
      console.log('Converting response to speech...');
      const { data: audioArrayBuffer } = await supabase.functions.invoke('text-to-speech', {
        body: { text }
      });

      if (!this.audioContext) {
        this.audioContext = new AudioContext();
      }
      
      const audioBuffer = await this.audioContext.decodeAudioData(audioArrayBuffer);
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);
      source.start(0);
    } catch (error) {
      console.error('Error in text-to-speech service:', error);
      toast.error('Error converting text to speech');
      throw error;
    }
  }

  cleanup() {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}