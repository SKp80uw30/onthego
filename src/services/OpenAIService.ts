import axios from 'axios';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export class OpenAIService {
  private conversationHistory: { role: string; content: string }[] = [];
  private audioContext: AudioContext | null = null;

  constructor() {
    this.conversationHistory = [];
  }

  async processAudioChunk(audioBlob: Blob) {
    try {
      const { data: { OPENAI_API_KEY } } = await supabase.functions.invoke('get-openai-key');
      
      if (!OPENAI_API_KEY) {
        toast.error('OpenAI API key not found');
        return;
      }

      // Step 1: Convert speech to text using Whisper
      const formData = new FormData();
      formData.append('file', audioBlob, 'audio.webm');
      formData.append('model', 'whisper-1');

      const whisperResponse = await axios.post(
        'https://api.openai.com/v1/audio/transcriptions',
        formData,
        {
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      const transcribedText = whisperResponse.data.text;
      console.log('Transcribed text:', transcribedText);
      
      // Add user message to history
      this.conversationHistory.push({ role: 'user', content: transcribedText });

      // Step 2: Get AI response
      const chatResponse = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: "gpt-4",
          messages: this.conversationHistory,
          max_tokens: 150
        },
        {
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const aiResponse = chatResponse.data.choices[0].message.content;
      console.log('AI response:', aiResponse);
      
      // Add AI response to history
      this.conversationHistory.push({ role: 'assistant', content: aiResponse });

      // Trim conversation history if needed
      if (this.conversationHistory.length > 50) {
        this.conversationHistory = this.conversationHistory.slice(-50);
      }

      // Step 3: Convert AI response to speech
      const speechResponse = await axios.post(
        'https://api.openai.com/v1/audio/speech',
        {
          model: "tts-1",
          voice: "alloy",
          input: aiResponse
        },
        {
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          },
          responseType: 'arraybuffer'
        }
      );

      // Play the audio response
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }
      
      const audioBuffer = await this.audioContext.decodeAudioData(speechResponse.data);
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);
      source.start(0);

      return { transcribedText, aiResponse };
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