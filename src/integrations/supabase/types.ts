export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      conversation_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          metadata: Json | null
          role: string
          session_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role: string
          session_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_session"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "conversation_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_sessions: {
        Row: {
          created_at: string | null
          id: string
          last_active: string | null
          slack_account_id: string
          status: Database["public"]["Enums"]["conversation_status"] | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_active?: string | null
          slack_account_id: string
          status?: Database["public"]["Enums"]["conversation_status"] | null
        }
        Update: {
          created_at?: string | null
          id?: string
          last_active?: string | null
          slack_account_id?: string
          status?: Database["public"]["Enums"]["conversation_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_sessions_slack_account_id_fkey"
            columns: ["slack_account_id"]
            isOneToOne: false
            referencedRelation: "slack_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_slack_account"
            columns: ["slack_account_id"]
            isOneToOne: false
            referencedRelation: "slack_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          channel_id: string | null
          id: string
          mentioned_users: string[] | null
          message_content: string
          processed: boolean | null
          read_status: boolean | null
          received_at: string | null
          sender_id: string | null
          sender_name: string | null
          slack_account_id: string | null
          urgency_level: number | null
        }
        Insert: {
          channel_id?: string | null
          id?: string
          mentioned_users?: string[] | null
          message_content: string
          processed?: boolean | null
          read_status?: boolean | null
          received_at?: string | null
          sender_id?: string | null
          sender_name?: string | null
          slack_account_id?: string | null
          urgency_level?: number | null
        }
        Update: {
          channel_id?: string | null
          id?: string
          mentioned_users?: string[] | null
          message_content?: string
          processed?: boolean | null
          read_status?: boolean | null
          received_at?: string | null
          sender_id?: string | null
          sender_name?: string | null
          slack_account_id?: string | null
          urgency_level?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_slack_account_id_fkey"
            columns: ["slack_account_id"]
            isOneToOne: false
            referencedRelation: "slack_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          id: string
        }
        Insert: {
          created_at?: string
          id: string
        }
        Update: {
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          created_at: string | null
          default_workspace_id: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          default_workspace_id?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          default_workspace_id?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "settings_default_workspace_id_fkey"
            columns: ["default_workspace_id"]
            isOneToOne: false
            referencedRelation: "slack_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      slack_accounts: {
        Row: {
          created_at: string | null
          id: string
          slack_bot_token: string
          slack_user_handle: string | null
          slack_workspace_id: string
          slack_workspace_name: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          slack_bot_token: string
          slack_user_handle?: string | null
          slack_workspace_id: string
          slack_workspace_name?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          slack_bot_token?: string
          slack_user_handle?: string | null
          slack_workspace_id?: string
          slack_workspace_name?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "slack_accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          email: string
          id: string
          password_hash: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          password_hash: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          password_hash?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      conversation_status: "active" | "completed" | "expired"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
