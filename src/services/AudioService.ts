export class AudioService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private isRecording: boolean = false;

  async initialize() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream);
      
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        await this.processAudio(audioBlob);
        this.audioChunks = [];
      };

      console.log('Audio service initialized successfully');
      return true;
    } catch (error) {
      console.error('Error initializing audio service:', error);
      return false;
    }
  }

  startRecording() {
    if (!this.mediaRecorder || this.isRecording) return;
    
    try {
      this.mediaRecorder.start();
      this.isRecording = true;
      console.log('Started recording');
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  }

  stopRecording() {
    if (!this.mediaRecorder || !this.isRecording) return;
    
    try {
      this.mediaRecorder.stop();
      this.isRecording = false;
      console.log('Stopped recording');
    } catch (error) {
      console.error('Error stopping recording:', error);
    }
  }

  private async processAudio(audioBlob: Blob) {
    try {
      // Create form data for the audio file
      const formData = new FormData();
      formData.append('file', audioBlob, 'audio.webm');
      formData.append('model', 'whisper-1');

      // Call the Supabase Edge Function to process the audio
      const { data, error } = await supabase.functions.invoke('process-audio', {
        body: formData,
      });

      if (error) {
        throw new Error(`Supabase Function error: ${error.message}`);
      }

      console.log('Transcription:', data.text);
      return data.text;
      
    } catch (error) {
      console.error('Error processing audio:', error);
      toast.error('Error processing audio');
      throw error;
    }
  }

  cleanup() {
    if (this.mediaRecorder) {
      if (this.isRecording) {
        this.mediaRecorder.stop();
      }
      this.mediaRecorder = null;
    }
    this.audioChunks = [];
    this.isRecording = false;
  }
}