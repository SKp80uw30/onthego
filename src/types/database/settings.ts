export interface SettingRow {
  id: string;
  user_id: string | null;
  default_workspace_id: string | null;
  created_at: string | null;
}

export interface SettingInsert {
  id?: string;
  user_id?: string | null;
  default_workspace_id?: string | null;
  created_at?: string | null;
}

export interface SettingUpdate {
  id?: string;
  user_id?: string | null;
  default_workspace_id?: string | null;
  created_at?: string | null;
}