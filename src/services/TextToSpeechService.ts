import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export class TextToSpeechService {
  private audioContext: AudioContext | null = null;
  private isSpeaking: boolean = false;
  private speechQueue: string[] = [];
  private currentSource: AudioBufferSourceNode | null = null;

  async speakText(text: string): Promise<void> {
    // Add the text to the queue
    this.speechQueue.push(text);
    
    // If we're not currently speaking, start processing the queue
    if (!this.isSpeaking) {
      await this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    if (this.speechQueue.length === 0 || this.isSpeaking) {
      return;
    }

    this.isSpeaking = true;
    const text = this.speechQueue[0];

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
        this.currentSource = source;
        source.buffer = audioBuffer;
        source.connect(this.audioContext.destination);
        
        // Wait for the audio to finish playing before processing the next item
        source.onended = async () => {
          console.log('Finished playing audio');
          this.currentSource = null;
          this.speechQueue.shift(); // Remove the played item
          this.isSpeaking = false;
          
          // Process the next item in the queue if there is one
          if (this.speechQueue.length > 0) {
            await this.processQueue();
          }
        };
        
        source.start(0);
      } catch (decodeError) {
        console.error('Audio decoding error:', decodeError);
        this.handleError('Failed to decode audio data');
      }
    } catch (error) {
      console.error('Error in text-to-speech service:', error);
      this.handleError('Error converting text to speech');
    }
  }

  private handleError(message: string) {
    toast.error(message);
    // Clean up the failed item and continue with the queue
    this.speechQueue.shift();
    this.isSpeaking = false;
    this.processQueue();
  }

  cleanup() {
    if (this.currentSource) {
      this.currentSource.stop();
      this.currentSource.disconnect();
      this.currentSource = null;
    }
    if (this.audioContext) {
      console.log('Cleaning up AudioContext...');
      this.audioContext.close();
      this.audioContext = null;
    }
    this.speechQueue = [];
    this.isSpeaking = false;
  }
}