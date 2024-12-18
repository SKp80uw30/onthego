import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export class TextToSpeechService {
  private audioContext: AudioContext | null = null;

  async speakText(text: string): Promise<void> {
    try {
      console.log('Converting text to speech:', text);
      
      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: { text }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

      if (!data || !data.audioBase64) {
        console.error('Invalid response format:', data);
        throw new Error('Invalid response from text-to-speech service');
      }

      // Convert base64 to Uint8Array
      console.log('Converting base64 to audio data...');
      const binaryString = atob(data.audioBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Create AudioContext if it doesn't exist
      if (!this.audioContext) {
        console.log('Creating new AudioContext...');
        this.audioContext = new AudioContext();
      }

      console.log('Decoding audio data...', {
        arrayBufferLength: bytes.buffer.byteLength,
        audioContextState: this.audioContext.state
      });

      try {
        const audioBuffer = await this.audioContext.decodeAudioData(bytes.buffer);
        console.log('Audio successfully decoded, playing...');
        
        const source = this.audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(this.audioContext.destination);
        source.start(0);
      } catch (decodeError) {
        console.error('Audio decoding error:', decodeError);
        throw new Error('Failed to decode audio data');
      }
    } catch (error) {
      console.error('Error in text-to-speech service:', error);
      toast.error('Error converting text to speech');
      throw error;
    }
  }

  cleanup() {
    if (this.audioContext) {
      console.log('Cleaning up AudioContext...');
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}