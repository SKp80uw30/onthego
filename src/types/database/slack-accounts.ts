export interface SlackAccountRow {
  id: string;
  user_id: string | null;
  slack_workspace_id: string;
  slack_workspace_name: string | null;
  slack_bot_token: string;
  created_at: string | null;
}

export interface SlackAccountInsert {
  id?: string;
  user_id?: string | null;
  slack_workspace_id: string;
  slack_workspace_name?: string | null;
  slack_bot_token: string;
  created_at?: string | null;
}

export interface SlackAccountUpdate {
  id?: string;
  user_id?: string | null;
  slack_workspace_id?: string;
  slack_workspace_name?: string | null;
  slack_bot_token?: string;
  created_at?: string | null;
}