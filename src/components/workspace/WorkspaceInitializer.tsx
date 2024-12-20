import React, { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AudioService } from '@/services/AudioService';

interface WorkspaceInitializerProps {
  userId: string;
  audioService: AudioService;
}

export const WorkspaceInitializer = ({ userId, audioService }: WorkspaceInitializerProps) => {
  useEffect(() => {
    const fetchDefaultWorkspace = async () => {
      try {
        console.log('Fetching slack accounts...');
        // First try to get settings
        const { data: settings, error: settingsError } = await supabase
          .from('settings')
          .select('default_workspace_id')
          .eq('user_id', userId)
          .limit(1)
          .maybeSingle();

        if (settingsError) {
          console.error('Error fetching settings:', settingsError);
        }

        if (settings?.default_workspace_id) {
          console.log('Using default workspace:', settings.default_workspace_id);
          audioService.getOpenAIService().setSlackAccountId(settings.default_workspace_id);
          return;
        }

        // Fallback to first available workspace if no settings
        const { data: workspaces, error: workspacesError } = await supabase
          .from('slack_accounts')
          .select('id')
          .eq('user_id', userId)
          .limit(1)
          .maybeSingle();

        if (workspacesError) {
          console.error('Error fetching workspaces:', workspacesError);
          return;
        }

        if (workspaces?.id) {
          console.log('Using workspace:', workspaces.id);
          audioService.getOpenAIService().setSlackAccountId(workspaces.id);
          
          // Create settings with this workspace as default
          const { error: upsertError } = await supabase
            .from('settings')
            .upsert({
              user_id: userId,
              default_workspace_id: workspaces.id
            });

          if (upsertError) {
            console.error('Error upserting settings:', upsertError);
          }
        } else {
          console.log('No Slack workspace connected');
          toast.error('Please connect a Slack workspace to use voice commands');
        }
      } catch (error) {
        console.error('Error in fetchDefaultWorkspace:', error);
        toast.error('Failed to fetch workspace settings');
      }
    };

    if (userId) {
      fetchDefaultWorkspace();
    }
  }, [userId, audioService]);

  return null;
};