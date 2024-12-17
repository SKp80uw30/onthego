import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export class TextToSpeechService {
  private audioContext: AudioContext | null = null;

  async speakText(text: string): Promise<void> {
    try {
      console.log('Converting text to speech:', text);
      
      const { data: audioArrayBuffer, error } = await supabase.functions.invoke('text-to-speech', {
        body: { text }
      });

      if (error) {
        throw error;
      }

      if (!this.audioContext) {
        this.audioContext = new AudioContext();
      }

      console.log('Decoding audio data...');
      const audioBuffer = await this.audioContext.decodeAudioData(audioArrayBuffer);
      
      console.log('Playing audio...');
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