import { ChatStateManager } from '@/services/openai/functionCalling/stateManager';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export class VoiceStateManager {
  private chatState: ChatStateManager;
  private currentSlackAccountId: string | null = null;

  constructor(chatState: ChatStateManager) {
    this.chatState = chatState;
  }

  async setupSlackAccount(userId: string) {
    try {
      const { data: settings, error: settingsError } = await supabase
        .from('settings')
        .select('default_workspace_id')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle();

      if (settingsError) throw settingsError;

      const workspaceId = settings?.default_workspace_id;
      
      if (!workspaceId) {
        const { data: accounts, error: accountsError } = await supabase
          .from('slack_accounts')
          .select('id')
          .eq('user_id', userId)
          .limit(1)
          .maybeSingle();

        if (accountsError) throw accountsError;
        
        if (accounts?.id) {
          this.setSlackAccountId(accounts.id);
        } else {
          toast.error('No Slack workspace connected');
        }
      } else {
        this.setSlackAccountId(workspaceId);
      }
    } catch (error) {
      console.error('Error in setupSlackAccount:', error);
      toast.error('Failed to initialize workspace');
    }
  }

  setSlackAccountId(id: string) {
    this.currentSlackAccountId = id;
    this.chatState.setSlackAccountId(id);
  }

  getCurrentSlackAccountId() {
    return this.currentSlackAccountId;
  }

  getChatState() {
    return this.chatState;
  }
}