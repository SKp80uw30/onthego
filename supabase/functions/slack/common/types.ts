export interface SlackMessage {
  text: string;
  user?: string;
  ts?: string;
  thread_ts?: string;
}

export interface SlackChannel {
  id: string;
  name: string;
  is_member: boolean;
  is_private: boolean;
}

export interface SlackDMUser {
  id: string;
  name?: string;
  real_name?: string;
  profile?: {
    display_name?: string;
    email?: string;
  };
}

export interface SlackError {
  ok: false;
  error: string;
}

export interface SlackSuccess {
  ok: true;
  [key: string]: any;
}

export type SlackResponse = SlackError | SlackSuccess;