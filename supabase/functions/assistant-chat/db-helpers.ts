import { createClient } from 'npm:@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

export const supabase = createClient(supabaseUrl, supabaseKey);

export async function getCommandParserAssistant() {
  console.log('Fetching command parser assistant ID');
  // Return the specific assistant ID directly
  return "asst_LBYQQezR9PxDETVriDGzHuW5";
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