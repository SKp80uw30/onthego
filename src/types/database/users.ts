export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  created_at: string | null;
}

export interface UserInsert {
  id?: string;
  email: string;
  password_hash: string;
  created_at?: string | null;
}

export interface UserUpdate {
  id?: string;
  email?: string;
  password_hash?: string;
  created_at?: string | null;
}