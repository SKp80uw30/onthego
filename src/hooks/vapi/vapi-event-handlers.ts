import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const handleToolExecution = async (toolCall: any) => {
  try {
    console.log('Executing tool:', toolCall);
    
    const { data: response, error } = await supabase.functions.invoke('vapi-tools', {
      body: { message: { toolCalls: [toolCall] } }
    });

    if (error) {
      console.error('Tool execution error:', error);
      toast.error('Failed to execute tool');
      return null;
    }

    console.log('Tool execution response:', response);
    return response;
  } catch (err) {
    console.error('Tool execution error:', err);
    toast.error('Failed to execute tool');
    return null;
  }
};