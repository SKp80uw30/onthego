import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export class OpenAIService {
  private conversationHistory: { role: string; content: string }[] = [];
  private audioContext: AudioContext | null = null;
  private slackAccountId: string | null = null;

  constructor() {
    this.conversationHistory = [];
  }

  setSlackAccountId(id: string) {
    this.slackAccountId = id;
  }

  async processAudioChunk(audioBlob: Blob) {
    try {
      if (!this.slackAccountId) {
        toast.error('No Slack account selected');
        return;
      }

      console.log('Processing audio chunk with size:', audioBlob.size);

      // Step 1: Convert speech to text using Whisper
      const formData = new FormData();
      formData.append('file', audioBlob, 'audio.webm');
      formData.append('model', 'whisper-1');
      formData.append('response_format', 'json');

      console.log('Sending request to process-audio function...');
      const { data: transcriptionData, error: transcriptionError } = await supabase.functions.invoke('process-audio', {
        body: formData,
      });

      if (transcriptionError) {
        throw new Error(`Error transcribing audio: ${transcriptionError.message}`);
      }

      const transcribedText = transcriptionData.text;
      console.log('Transcribed text:', transcribedText);

      // Step 2: Process with AI chat
      console.log('Sending to chat-with-ai function...');
      const { data: chatResponse, error: chatError } = await supabase.functions.invoke('chat-with-ai', {
        body: {
          message: transcribedText,
          slackAccountId: this.slackAccountId,
          conversationHistory: this.conversationHistory,
        },
      });

      if (chatError) {
        throw new Error(`Error in AI chat: ${chatError.message}`);
      }

      // Update conversation history
      this.conversationHistory = chatResponse.conversationHistory;

      // Step 3: Convert AI response to speech
      console.log('Converting response to speech...');
      const { data: audioArrayBuffer } = await supabase.functions.invoke('text-to-speech', {
        body: { text: chatResponse.response }
      });

      // Play the audio response
      if (!this.audioContext) {
        this.audioContext = new AudioContext();
      }
      
      const audioBuffer = await this.audioContext.decodeAudioData(audioArrayBuffer);
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);
      source.start(0);

      return { transcribedText, aiResponse: chatResponse.response };
    } catch (error) {
      console.error('Error in OpenAI service:', error);
      toast.error('Error processing audio');
      throw error;
    }
  }

  cleanup() {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.conversationHistory = [];
  }
}