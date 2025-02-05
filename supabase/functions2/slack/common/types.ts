export interface SlackApiResponse {
  ok: boolean;
  error?: string;
  [key: string]: any;
}

export interface SlackAccount {
  id: string;
  slack_bot_token: string;
  slack_workspace_id: string;
  slack_workspace_name?: string;
}

export interface SlackMessage {
  ts: string;
  text: string;
  user: string;
  team: string;
  channel: string;
  thread_ts?: string;
}