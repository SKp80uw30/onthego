import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { VoiceButton } from '@/components/VoiceButton';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';
import { LoginForm } from '@/components/auth/LoginForm';
import { Header } from '@/components/dashboard/Header';
import { OnboardingSection } from '@/components/dashboard/OnboardingSection';

const Index = () => {
  const [isListening, setIsListening] = useState(false);
  const [session, setSession] = useState(null);
  const isMobile = useIsMobile();
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [audioRecorder, setAudioRecorder] = useState<any>(null);

  useEffect(() => {
    // Initialize WebSocket connection
    const socket = new WebSocket(`wss://slomrtdygughdpenilco.functions.supabase.co/realtime-chat`);
    
    socket.onopen = () => {
      console.log('Connected to chat server');
    };

    socket.onmessage = async (event) => {
      const data = JSON.parse(event.data);
      console.log('Received message:', data);

      if (data.type === 'response.audio.delta') {
        // Handle audio response
        const audioData = atob(data.delta);
        const audioArray = new Uint8Array(audioData.length);
        for (let i = 0; i < audioData.length; i++) {
          audioArray[i] = audioData.charCodeAt(i);
        }
        
        if (audioContext) {
          try {
            const audioBuffer = await audioContext.decodeAudioData(audioArray.buffer);
            const source = audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContext.destination);
            source.start();
          } catch (error) {
            console.error('Error playing audio:', error);
          }
        }
      }
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      toast.error('Connection error. Please try again.');
    };

    setWs(socket);

    // Initialize AudioContext
    const context = new AudioContext();
    setAudioContext(context);

    return () => {
      socket.close();
      if (audioContext) {
        audioContext.close();
      }
    };
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        toast.success('Successfully logged in!');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleStartListening = async () => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      toast.error('Connection not ready. Please try again.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      const recorder = new AudioRecorder((audioData: Float32Array) => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          const encodedAudio = encodeAudioForAPI(audioData);
          ws.send(JSON.stringify({
            type: 'input_audio_buffer.append',
            audio: encodedAudio
          }));
        }
      });

      await recorder.start();
      setAudioRecorder(recorder);
      setIsListening(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Error accessing microphone. Please check permissions.');
    }
  };

  const handleStopListening = () => {
    if (audioRecorder) {
      audioRecorder.stop();
      setAudioRecorder(null);
    }
    setIsListening(false);
  };

  // Handle OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const savedState = localStorage.getItem('slack_oauth_state');

    if (code && state && state === savedState) {
      const handleSlackCallback = async (code: string) => {
        try {
          const response = await supabase.functions.invoke('slack-oauth', {
            body: { code },
          });
    
          if (response.error) {
            throw new Error(response.error.message);
          }
    
          toast.success('Successfully connected to Slack!');
        } catch (error) {
          console.error('Error connecting to Slack:', error);
          toast.error('Failed to connect to Slack');
        }
      };

      handleSlackCallback(code);
      window.history.replaceState({}, document.title, window.location.pathname);
      localStorage.removeItem('slack_oauth_state');
    }
  }, []);

  if (!session) {
    return <LoginForm />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <div className="container mx-auto px-4 py-6 md:py-8">
        <Header />
        <OnboardingSection />
        <div className={`fixed ${isMobile ? 'bottom-6 right-6' : 'bottom-8 right-8'}`}>
          <VoiceButton
            isListening={isListening}
            onStart={handleStartListening}
            onStop={handleStopListening}
            className="shadow-xl"
          />
        </div>
      </div>
    </div>
  );
};

class AudioRecorder {
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;

  constructor(private onAudioData: (audioData: Float32Array) => void) {}

  async start() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      this.audioContext = new AudioContext({
        sampleRate: 24000,
      });
      this.source = this.audioContext.createMediaStreamSource(this.stream);
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
      this.processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        this.onAudioData(new Float32Array(inputData));
      };
      this.source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      throw error;
    }
  }

  stop() {
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

const encodeAudioForAPI = (float32Array: Float32Array): string => {
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  const uint8Array = new Uint8Array(int16Array.buffer);
  let binary = '';
  const chunkSize = 0x8000;
  
  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
    binary += String.fromCharCode.apply(null, chunk);
  }
  
  return btoa(binary);
};

export default Index;