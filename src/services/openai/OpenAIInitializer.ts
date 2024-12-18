import { supabase } from "@/integrations/supabase/client";
import { OpenAIState } from "./OpenAIState";

export class OpenAIInitializer {
  private state: OpenAIState;

  constructor(state: OpenAIState) {
    this.state = state;
  }

  async initialize(): Promise<void> {
    console.log(`[OpenAIInitializer ${this.state.getInstanceId()}] Initialize called. Current state:`, {
      initialized: this.state.isInitialized(),
      slackAccountId: this.state.getSlackAccountId(),
      hasInitPromise: !!this.state.getInitializationPromise()
    });

    if (this.state.getInitializationPromise()) {
      console.log(`[OpenAIInitializer ${this.state.getInstanceId()}] Returning existing initialization promise`);
      return this.state.getInitializationPromise();
    }

    const initPromise = new Promise<void>(async (resolve) => {
      try {
        console.log(`[OpenAIInitializer ${this.state.getInstanceId()}] Starting initialization process`);
        
        const { data: { session } } = await supabase.auth.getSession();
        console.log(`[OpenAIInitializer ${this.state.getInstanceId()}] Session check:`, {
          hasSession: !!session,
          userId: session?.user?.id
        });

        if (!session) {
          console.log(`[OpenAIInitializer ${this.state.getInstanceId()}] No active session found`);
          this.state.setInitialized(false);
          resolve();
          return;
        }

        const { data: settings } = await supabase
          .from('settings')
          .select('default_workspace_id')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (settings?.default_workspace_id) {
          this.state.setSlackAccountId(settings.default_workspace_id);
          console.log(`[OpenAIInitializer ${this.state.getInstanceId()}] Initialized with workspace ID:`, settings.default_workspace_id);
        } else {
          const { data: workspaces } = await supabase
            .from('slack_accounts')
            .select('id')
            .eq('user_id', session.user.id)
            .limit(1)
            .maybeSingle();

          if (workspaces?.id) {
            this.state.setSlackAccountId(workspaces.id);
            console.log(`[OpenAIInitializer ${this.state.getInstanceId()}] Initialized with fallback workspace ID:`, workspaces.id);
          } else {
            console.log(`[OpenAIInitializer ${this.state.getInstanceId()}] No workspace found`);
            this.state.setInitialized(false);
          }
        }

        resolve();
      } catch (error) {
        console.error(`[OpenAIInitializer ${this.state.getInstanceId()}] Initialization error:`, error);
        this.state.setInitialized(false);
        resolve();
      }
    });

    this.state.setInitializationPromise(initPromise);
    return initPromise;
  }
}