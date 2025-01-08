import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import "https://deno.land/x/xhr@0.1.0/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('🎤 Processing audio request...');
    
    const contentType = req.headers.get('content-type') || '';
    console.log('📝 Request content type:', contentType);
    
    if (!contentType.includes('multipart/form-data')) {
      console.error('❌ Invalid content type:', contentType);
      return new Response(
        JSON.stringify({ error: 'Invalid content type. Expected multipart/form-data' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    const formData = await req.formData();
    const audioFile = formData.get('file');
    
    if (!audioFile) {
      console.error('❌ No audio file received in form data');
      return new Response(
        JSON.stringify({ error: 'No audio file received' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    // Log detailed information about the audio file
    console.log('🎵 Audio file details:', {
      type: audioFile.type,
      size: audioFile.size,
      name: audioFile.name,
      constructor: audioFile.constructor.name,
      prototype: Object.getPrototypeOf(audioFile).constructor.name
    });

    // Ensure we're using a supported format and proper MIME type
    const processedAudioFile = new File([audioFile], 'audio.webm', { 
      type: 'audio/webm;codecs=opus'
    });

    console.log('📦 Processed audio file details:', {
      type: processedAudioFile.type,
      size: processedAudioFile.size,
      name: processedAudioFile.name
    });

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      console.error('❌ OpenAI API key not found');
      return new Response(
        JSON.stringify({ error: 'Service configuration error' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 503 
        }
      );
    }

    console.log('🚀 Sending request to OpenAI...');
    const openAIFormData = new FormData();
    openAIFormData.append('file', processedAudioFile);
    openAIFormData.append('model', 'whisper-1');
    openAIFormData.append('response_format', 'json');

    // Log the FormData contents
    console.log('📤 FormData details:', {
      hasFile: openAIFormData.has('file'),
      fileName: processedAudioFile.name,
      fileType: processedAudioFile.type
    });

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
      },
      body: openAIFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OpenAI API error response:', errorText);
      
      try {
        const errorJson = JSON.parse(errorText);
        console.error('📋 Parsed error:', errorJson);
        return new Response(
          JSON.stringify({ 
            error: 'Failed to process audio',
            details: errorJson.error?.message || errorText
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: response.status,
          },
        );
      } catch (e) {
        console.error('❌ Error parsing OpenAI error response:', e);
        return new Response(
          JSON.stringify({ 
            error: 'Failed to process audio',
            details: errorText
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: response.status,
          },
        );
      }
    }

    const data = await response.json();
    console.log('✅ Transcription successful');

    return new Response(
      JSON.stringify(data),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error) {
    console.error('❌ Error processing audio:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Error processing audio',
        details: error.message
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }
});