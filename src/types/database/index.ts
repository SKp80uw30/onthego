import { Json } from './json';
import { MessageRow, MessageInsert, MessageUpdate } from './messages';
import { ProfileRow, ProfileInsert, ProfileUpdate } from './profiles';
import { SettingRow, SettingInsert, SettingUpdate } from './settings';
import { SlackAccountRow, SlackAccountInsert, SlackAccountUpdate } from './slack-accounts';
import { UserRow, UserInsert, UserUpdate } from './users';

export interface Database {
  public: {
    Tables: {
      messages: {
        Row: MessageRow;
        Insert: MessageInsert;
        Update: MessageUpdate;
      };
      profiles: {
        Row: ProfileRow;
        Insert: ProfileInsert;
        Update: ProfileUpdate;
      };
      settings: {
        Row: SettingRow;
        Insert: SettingInsert;
        Update: SettingUpdate;
      };
      slack_accounts: {
        Row: SlackAccountRow;
        Insert: SlackAccountInsert;
        Update: SlackAccountUpdate;
      };
      users: {
        Row: UserRow;
        Insert: UserInsert;
        Update: UserUpdate;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];

export * from './json';
export * from './messages';
export * from './profiles';
export * from './settings';
export * from './slack-accounts';
export * from './users';