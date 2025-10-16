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
      Bookings: {
        Row: {
          clinician_id: string | null
          id: string
          session_date: string
          session_type: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          clinician_id?: string | null
          id?: string
          session_date?: string
          session_type?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          clinician_id?: string | null
          id?: string
          session_date?: string
          session_type?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "Bookings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "Users"
            referencedColumns: ["id"]
          },
        ]
      }
      csv_uploads: {
        Row: {
          created_at: string
          file_url: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_url: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_url?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      fitbit_auto_data: {
        Row: {
          activity: Json | null
          fetched_at: string | null
          id: number
          sleep: Json | null
          user_id: string | null
        }
        Insert: {
          activity?: Json | null
          fetched_at?: string | null
          id?: number
          sleep?: Json | null
          user_id?: string | null
        }
        Update: {
          activity?: Json | null
          fetched_at?: string | null
          id?: number
          sleep?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      fitbit_data: {
        Row: {
          data: Json
          fetched_at: string
          id: string
          user_id: string | null
        }
        Insert: {
          data: Json
          fetched_at: string
          id?: string
          user_id?: string | null
        }
        Update: {
          data?: Json
          fetched_at?: string
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      fitbit_sleep: {
        Row: {
          date: string
          fetched_at: string | null
          heart_data: Json | null
          id: string
          sleep_data: Json | null
        }
        Insert: {
          date: string
          fetched_at?: string | null
          heart_data?: Json | null
          id?: string
          sleep_data?: Json | null
        }
        Update: {
          date?: string
          fetched_at?: string | null
          heart_data?: Json | null
          id?: string
          sleep_data?: Json | null
        }
        Relationships: []
      }
      fitbit_trends: {
        Row: {
          acute_load: number | null
          acwr: number | null
          chronic_load: number | null
          created_at: string | null
          date: string
          ewma: number | null
          hrv: number | null
          id: string
          monotony: number | null
          strain: number | null
          training_load: number | null
          user_id: string
        }
        Insert: {
          acute_load?: number | null
          acwr?: number | null
          chronic_load?: number | null
          created_at?: string | null
          date: string
          ewma?: number | null
          hrv?: number | null
          id?: string
          monotony?: number | null
          strain?: number | null
          training_load?: number | null
          user_id: string
        }
        Update: {
          acute_load?: number | null
          acwr?: number | null
          chronic_load?: number | null
          created_at?: string | null
          date?: string
          ewma?: number | null
          hrv?: number | null
          id?: string
          monotony?: number | null
          strain?: number | null
          training_load?: number | null
          user_id?: string
        }
        Relationships: []
      }
      health_daily: {
        Row: {
          active_energy_kcal: number | null
          date: string | null
          distance_m: number | null
          id: string
          resting_hr: number | null
          steps: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          active_energy_kcal?: number | null
          date?: string | null
          distance_m?: number | null
          id?: string
          resting_hr?: number | null
          steps?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          active_energy_kcal?: number | null
          date?: string | null
          distance_m?: number | null
          id?: string
          resting_hr?: number | null
          steps?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "health_daily_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "fitbit_dashboard_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "health_daily_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      health_data: {
        Row: {
          collected_at: string | null
          id: number
          samples: Json | null
          user_id: string
        }
        Insert: {
          collected_at?: string | null
          id?: number
          samples?: Json | null
          user_id: string
        }
        Update: {
          collected_at?: string | null
          id?: number
          samples?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      notification_log: {
        Row: {
          created_at: string
          id: string
          message: string
          recipient: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          recipient: string
          status: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          recipient?: string
          status?: string
        }
        Relationships: []
      }
      "Risk Scores": {
        Row: {
          date: string | null
          id: string
          score: number | null
          status: string | null
          user_id: string
        }
        Insert: {
          date?: string | null
          id?: string
          score?: number | null
          status?: string | null
          user_id?: string
        }
        Update: {
          date?: string | null
          id?: string
          score?: number | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "Risk Scores_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "Users"
            referencedColumns: ["id"]
          },
        ]
      }
      terra_connections: {
        Row: {
          connected_at: string | null
          id: string
          provider: string | null
          terra_user_id: string | null
          user_id: string | null
        }
        Insert: {
          connected_at?: string | null
          id?: string
          provider?: string | null
          terra_user_id?: string | null
          user_id?: string | null
        }
        Update: {
          connected_at?: string | null
          id?: string
          provider?: string | null
          terra_user_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "terra_connections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "fitbit_dashboard_view"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "terra_connections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_fitbit_data: {
        Row: {
          calories: number | null
          collected_at: string | null
          distance: number | null
          heart_rate: number | null
          hrv: number | null
          id: string
          readiness_score: number | null
          resting_hr: number | null
          sleep_duration: number | null
          sleep_efficiency: number | null
          source: string | null
          spo2: number | null
          steps: number | null
          training_load: number | null
          user_id: string | null
        }
        Insert: {
          calories?: number | null
          collected_at?: string | null
          distance?: number | null
          heart_rate?: number | null
          hrv?: number | null
          id?: string
          readiness_score?: number | null
          resting_hr?: number | null
          sleep_duration?: number | null
          sleep_efficiency?: number | null
          source?: string | null
          spo2?: number | null
          steps?: number | null
          training_load?: number | null
          user_id?: string | null
        }
        Update: {
          calories?: number | null
          collected_at?: string | null
          distance?: number | null
          heart_rate?: number | null
          hrv?: number | null
          id?: string
          readiness_score?: number | null
          resting_hr?: number | null
          sleep_duration?: number | null
          sleep_efficiency?: number | null
          source?: string | null
          spo2?: number | null
          steps?: number | null
          training_load?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          connected_at: string | null
          created_at: string | null
          email: string | null
          fitbit_connected: boolean | null
          fitbit_user_id: string | null
          id: string
          refresh_token: string | null
        }
        Insert: {
          connected_at?: string | null
          created_at?: string | null
          email?: string | null
          fitbit_connected?: boolean | null
          fitbit_user_id?: string | null
          id?: string
          refresh_token?: string | null
        }
        Update: {
          connected_at?: string | null
          created_at?: string | null
          email?: string | null
          fitbit_connected?: boolean | null
          fitbit_user_id?: string | null
          id?: string
          refresh_token?: string | null
        }
        Relationships: []
      }
      Users: {
        Row: {
          created_at: string
          email: string | null
          email_preferences: Json | null
          id: string
          name: string | null
          wearables_connected: Json | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          email_preferences?: Json | null
          id?: string
          name?: string | null
          wearables_connected?: Json | null
        }
        Update: {
          created_at?: string
          email?: string | null
          email_preferences?: Json | null
          id?: string
          name?: string | null
          wearables_connected?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "Users_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "Users"
            referencedColumns: ["id"]
          },
        ]
      }
      Wearables: {
        Row: {
          created_at: string
          date: string | null
          heart_rate: number | null
          HRV: number | null
          id: string
          sleep_hours: number | null
          steps: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          date?: string | null
          heart_rate?: number | null
          HRV?: number | null
          id?: string
          sleep_hours?: number | null
          steps?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          date?: string | null
          heart_rate?: number | null
          HRV?: number | null
          id?: string
          sleep_hours?: number | null
          steps?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "Wearables_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "Users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      fitbit_daily_summary: {
        Row: {
          avg_hr: number | null
          calories: number | null
          date: string | null
          distance: number | null
          email: string | null
          floors: number | null
          sleep_hours: number | null
          steps: number | null
          user_id: string | null
        }
        Relationships: []
      }
      fitbit_dashboard: {
        Row: {
          activity: Json | null
          fetched_at: string | null
          sleep: Json | null
          user_id: string | null
        }
        Insert: {
          activity?: Json | null
          fetched_at?: string | null
          sleep?: Json | null
          user_id?: string | null
        }
        Update: {
          activity?: Json | null
          fetched_at?: string | null
          sleep?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      fitbit_dashboard_view: {
        Row: {
          avg_hr: number | null
          calories: number | null
          date: string | null
          email: string | null
          floors: number | null
          sleep_hours: number | null
          steps: number | null
          user_id: string | null
        }
        Relationships: []
      }
      user_training_metrics: {
        Row: {
          acute_load: number | null
          acwr: number | null
          acwr_status: string | null
          chronic_load: number | null
          daily_load: number | null
          day: string | null
          fatigue_index: number | null
          readiness_score_est: number | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
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
