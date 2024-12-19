import { Json } from './json';

export interface MessageRow {
  id: string;
  slack_account_id: string | null;
  message_content: string;
  channel_id: string | null;
  sender_id: string | null;
  received_at: string | null;
  processed: boolean | null;
  sender_name: string | null;
  read_status: boolean | null;
  urgency_level: number | null;
}

export interface MessageInsert {
  id?: string;
  slack_account_id?: string | null;
  message_content: string;
  channel_id?: string | null;
  sender_id?: string | null;
  received_at?: string | null;
  processed?: boolean | null;
  sender_name?: string | null;
  read_status?: boolean | null;
  urgency_level?: number | null;
}

export interface MessageUpdate {
  id?: string;
  slack_account_id?: string | null;
  message_content?: string;
  channel_id?: string | null;
  sender_id?: string | null;
  received_at?: string | null;
  processed?: boolean | null;
  sender_name?: string | null;
  read_status?: boolean | null;
  urgency_level?: number | null;
}