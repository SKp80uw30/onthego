export interface SlackAccount {
  id: string;
  slack_bot_token: string;
  slack_workspace_id: string;
  slack_workspace_name?: string;
}

export interface SlackApiResponse {
  ok: boolean;
  error?: string;
  [key: string]: any;
}