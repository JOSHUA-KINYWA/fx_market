export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      csv_import_logs: {
        Row: {
          account_id: string | null
          broker_format: string | null
          completed_at: string | null
          created_at: string | null
          error_details: Json | null
          error_rows: number | null
          file_name: string
          id: string
          imported_rows: number | null
          skipped_rows: number | null
          status: string | null
          total_rows: number | null
          user_id: string
        }
        Insert: {
          account_id?: string | null
          broker_format?: string | null
          completed_at?: string | null
          created_at?: string | null
          error_details?: Json | null
          error_rows?: number | null
          file_name: string
          id?: string
          imported_rows?: number | null
          skipped_rows?: number | null
          status?: string | null
          total_rows?: number | null
          user_id: string
        }
        Update: {
          account_id?: string | null
          broker_format?: string | null
          completed_at?: string | null
          created_at?: string | null
          error_details?: Json | null
          error_rows?: number | null
          file_name?: string
          id?: string
          imported_rows?: number | null
          skipped_rows?: number | null
          status?: string | null
          total_rows?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "csv_import_logs_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "trading_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "csv_import_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      emotion_tags: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          is_default: boolean | null
          name: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "emotion_tags_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mistake_tags: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_default: boolean | null
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mistake_tags_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          default_currency: string | null
          email: string | null
          full_name: string | null
          id: string
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          default_currency?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          default_currency?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      strategies: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          rules: string | null
          timeframes: string[] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          rules?: string | null
          timeframes?: string[] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          rules?: string | null
          timeframes?: string[] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "strategies_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_emotions: {
        Row: {
          created_at: string | null
          emotion_id: string
          id: string
          timing: string
          trade_id: string
        }
        Insert: {
          created_at?: string | null
          emotion_id: string
          id?: string
          timing: string
          trade_id: string
        }
        Update: {
          created_at?: string | null
          emotion_id?: string
          id?: string
          timing?: string
          trade_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trade_emotions_emotion_id_fkey"
            columns: ["emotion_id"]
            isOneToOne: false
            referencedRelation: "emotion_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_emotions_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_mistakes: {
        Row: {
          created_at: string | null
          id: string
          mistake_id: string
          trade_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          mistake_id: string
          trade_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          mistake_id?: string
          trade_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trade_mistakes_mistake_id_fkey"
            columns: ["mistake_id"]
            isOneToOne: false
            referencedRelation: "mistake_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_mistakes_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_notes: {
        Row: {
          content: string
          created_at: string | null
          id: string
          note_type: string | null
          trade_id: string
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          note_type?: string | null
          trade_id: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          note_type?: string | null
          trade_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trade_notes_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_screenshots: {
        Row: {
          caption: string | null
          created_at: string | null
          id: string
          image_url: string
          trade_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string | null
          id?: string
          image_url: string
          trade_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string | null
          id?: string
          image_url?: string
          trade_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trade_screenshots_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_setups: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          pattern_type: string | null
          strategy_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          pattern_type?: string | null
          strategy_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          pattern_type?: string | null
          strategy_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trade_setups_strategy_id_fkey"
            columns: ["strategy_id"]
            isOneToOne: false
            referencedRelation: "strategies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_setups_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trades: {
        Row: {
          account_id: string
          conviction_level: number | null
          created_at: string | null
          currency_pair: string
          direction: string
          entry_price: number
          entry_time: string
          execution_rating: number | null
          exit_price: number | null
          exit_time: string | null
          id: string
          lessons_learned: string | null
          market_conditions: string | null
          notes: string | null
          pips: number | null
          position_size: number
          profit_loss: number | null
          r_multiple: number | null
          risk_amount: number | null
          risk_reward_ratio: number | null
          rule_followed: boolean | null
          setup_id: string | null
          status: string | null
          stop_loss: number | null
          strategy_id: string | null
          take_profit: number | null
          ticket_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_id: string
          conviction_level?: number | null
          created_at?: string | null
          currency_pair: string
          direction: string
          entry_price: number
          entry_time: string
          execution_rating?: number | null
          exit_price?: number | null
          exit_time?: string | null
          id?: string
          lessons_learned?: string | null
          market_conditions?: string | null
          notes?: string | null
          pips?: number | null
          position_size: number
          profit_loss?: number | null
          r_multiple?: number | null
          risk_amount?: number | null
          risk_reward_ratio?: number | null
          rule_followed?: boolean | null
          setup_id?: string | null
          status?: string | null
          stop_loss?: number | null
          strategy_id?: string | null
          take_profit?: number | null
          ticket_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_id?: string
          conviction_level?: number | null
          created_at?: string | null
          currency_pair?: string
          direction?: string
          entry_price?: number
          entry_time?: string
          execution_rating?: number | null
          exit_price?: number | null
          exit_time?: string | null
          id?: string
          lessons_learned?: string | null
          market_conditions?: string | null
          notes?: string | null
          pips?: number | null
          position_size?: number
          profit_loss?: number | null
          r_multiple?: number | null
          risk_amount?: number | null
          risk_reward_ratio?: number | null
          rule_followed?: boolean | null
          setup_id?: string | null
          status?: string | null
          stop_loss?: number | null
          strategy_id?: string | null
          take_profit?: number | null
          ticket_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trades_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "trading_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trades_setup_id_fkey"
            columns: ["setup_id"]
            isOneToOne: false
            referencedRelation: "trade_setups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trades_strategy_id_fkey"
            columns: ["strategy_id"]
            isOneToOne: false
            referencedRelation: "strategies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trades_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trading_accounts: {
        Row: {
          account_name: string
          account_number: string | null
          account_type: string | null
          broker_name: string | null
          created_at: string | null
          currency: string | null
          current_balance: number | null
          id: string
          initial_balance: number | null
          is_active: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_name: string
          account_number?: string | null
          account_type?: string | null
          broker_name?: string | null
          created_at?: string | null
          currency?: string | null
          current_balance?: number | null
          id?: string
          initial_balance?: number | null
          is_active?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_name?: string
          account_number?: string | null
          account_type?: string | null
          broker_name?: string | null
          created_at?: string | null
          currency?: string | null
          current_balance?: number | null
          id?: string
          initial_balance?: number | null
          is_active?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trading_accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          created_at: string | null
          id: string
          preferences: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          preferences?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          preferences?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      insert_default_tags_for_user: {
        Args: { user_uuid: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
