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
        
        // First try to get the most recent settings for the user
        const { data: settings, error: settingsError } = await supabase
          .from('settings')
          .select('default_workspace_id')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (settingsError) {
          console.error('Error fetching settings:', settingsError);
          throw settingsError;
        }

        if (settings?.default_workspace_id) {
          console.log('Found default workspace:', settings.default_workspace_id);
          audioService.getOpenAIService().setSlackAccountId(settings.default_workspace_id);
          return;
        }

        // If no settings found, get the first available workspace
        const { data: workspaces, error: workspacesError } = await supabase
          .from('slack_accounts')
          .select('id')
          .eq('user_id', userId)
          .limit(1)
          .maybeSingle();

        if (workspacesError) {
          console.error('Error fetching workspaces:', workspacesError);
          throw workspacesError;
        }

        if (workspaces?.id) {
          console.log('Using first available workspace:', workspaces.id);
          audioService.getOpenAIService().setSlackAccountId(workspaces.id);
          
          // Clean up any existing settings before creating new one
          const { error: deleteError } = await supabase
            .from('settings')
            .delete()
            .eq('user_id', userId);

          if (deleteError) {
            console.error('Error cleaning up settings:', deleteError);
          }

          // Create new settings
          const { error: createError } = await supabase
            .from('settings')
            .insert({
              user_id: userId,
              default_workspace_id: workspaces.id
            });

          if (createError) {
            console.error('Error creating settings:', createError);
            toast.error('Failed to save workspace settings');
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