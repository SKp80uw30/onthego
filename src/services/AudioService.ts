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
      const formData = new FormData();
      formData.append('file', audioBlob, 'audio.webm');
      formData.append('model', 'whisper-1');
      
      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('Transcription:', data.text);
      
      // Here you can add logic to handle the transcribed text
      // For example, sending it to a Slack channel or processing it further
      
    } catch (error) {
      console.error('Error processing audio:', error);
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