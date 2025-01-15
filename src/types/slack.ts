export interface SlackAccount {
  id: string;
  user_id?: string;
  slack_workspace_id: string;
  slack_workspace_name?: string;
  slack_bot_token: string;
  created_at?: string;
  slack_user_handle?: string;
  needs_reauth?: boolean;
}

export interface SlackChannel {
  id: string;
  name: string;
  is_member: boolean;
  is_private: boolean;
}

export interface SlackDMUser {
  id?: string;
  slack_account_id?: string;
  slack_user_id?: string;
  display_name?: string;
  email?: string;
  is_active?: boolean;
}