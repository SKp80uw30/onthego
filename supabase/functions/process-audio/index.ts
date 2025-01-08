import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('[process-audio] Received request');
    const { audio, mimeType } = await req.json();
    
    if (!audio) {
      console.error('[process-audio] No audio data provided');
      throw new Error('No audio data provided');
    }

    if (!mimeType) {
      console.error('[process-audio] No MIME type provided');
      throw new Error('No MIME type provided');
    }

    console.log('[process-audio] Processing audio with MIME type:', mimeType);

    // Convert base64 to binary
    const binaryString = atob(audio);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Create blob and form data
    const audioBlob = new Blob([bytes], { type: mimeType });
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.webm');
    formData.append('model', 'whisper-1');

    console.log('[process-audio] Sending request to OpenAI Whisper API...');
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[process-audio] OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('[process-audio] Transcription successful');

    return new Response(JSON.stringify({ text: data.text }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[process-audio] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});