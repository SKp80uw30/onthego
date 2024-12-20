import { createClient } from 'npm:@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

export const supabase = createClient(supabaseUrl, supabaseKey);

export async function getCommandParserAssistant() {
  try {
    console.log('Fetching command parser assistant');
    const { data, error } = await supabase
      .from('assistants')
      .select('openai_assistant_id')
      .eq('assistant_type', 'command_parser')
      .single();

    if (error) {
      console.error('Error fetching assistant:', error);
      throw error;
    }

    if (!data) {
      console.error('Command parser assistant not found');
      throw new Error('Command parser assistant not found');
    }

    console.log('Found command parser assistant:', data.openai_assistant_id);
    return data.openai_assistant_id;
  } catch (error) {
    console.error('Error in getCommandParserAssistant:', error);
    throw error;
  }
}

export async function storeThread(threadId: string, assistantId: string, sessionId: string) {
  try {
    console.log('Storing thread in database:', { threadId, assistantId, sessionId });
    const { error } = await supabase
      .from('assistant_threads')
      .insert({
        openai_thread_id: threadId,
        assistant_id: assistantId,
        session_id: sessionId
      });

    if (error) {
      console.error('Error storing thread:', error);
      throw error;
    }
    
    console.log('Thread stored successfully');
  } catch (error) {
    console.error('Error in storeThread:', error);
    throw error;
  }
}