export interface ProfileRow {
  id: string;
  created_at: string;
}

export interface ProfileInsert {
  id: string;
  created_at?: string;
}

export interface ProfileUpdate {
  id?: string;
  created_at?: string;
}