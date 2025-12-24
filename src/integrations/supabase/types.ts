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
      activity_trends: {
        Row: {
          activity_score_avg: number | null
          calories_avg_7d: number | null
          calories_baseline: number | null
          calories_delta: number | null
          created_at: string | null
          id: string
          period_date: string
          steps_avg_7d: number | null
          steps_baseline: number | null
          steps_delta: number | null
          trend_direction: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          activity_score_avg?: number | null
          calories_avg_7d?: number | null
          calories_baseline?: number | null
          calories_delta?: number | null
          created_at?: string | null
          id?: string
          period_date: string
          steps_avg_7d?: number | null
          steps_baseline?: number | null
          steps_delta?: number | null
          trend_direction?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          activity_score_avg?: number | null
          calories_avg_7d?: number | null
          calories_baseline?: number | null
          calories_delta?: number | null
          created_at?: string | null
          id?: string
          period_date?: string
          steps_avg_7d?: number | null
          steps_baseline?: number | null
          steps_delta?: number | null
          trend_direction?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      adaptive_recommendations: {
        Row: {
          adaptive_suggestion: string | null
          confidence: number | null
          created_at: string | null
          deviation_pct: number | null
          generated_at: string | null
          id: string
          metric: string
          pattern: string | null
          recommendation: string | null
          risk_level: string | null
          risk_status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          adaptive_suggestion?: string | null
          confidence?: number | null
          created_at?: string | null
          deviation_pct?: number | null
          generated_at?: string | null
          id?: string
          metric: string
          pattern?: string | null
          recommendation?: string | null
          risk_level?: string | null
          risk_status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          adaptive_suggestion?: string | null
          confidence?: number | null
          created_at?: string | null
          deviation_pct?: number | null
          generated_at?: string | null
          id?: string
          metric?: string
          pattern?: string | null
          recommendation?: string | null
          risk_level?: string | null
          risk_status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
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
      daily_briefings: {
        Row: {
          category: string | null
          content: string
          context_used: Json | null
          created_at: string | null
          date: string
          id: string
          user_id: string
        }
        Insert: {
          category?: string | null
          content: string
          context_used?: Json | null
          created_at?: string | null
          date: string
          id?: string
          user_id: string
        }
        Update: {
          category?: string | null
          content?: string
          context_used?: Json | null
          created_at?: string | null
          date?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      document_insights: {
        Row: {
          confidence_score: number | null
          created_at: string | null
          document_id: string
          id: string
          insight_data: Json
          insight_type: string
          user_id: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string | null
          document_id: string
          id?: string
          insight_data: Json
          insight_type: string
          user_id: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string | null
          document_id?: string
          id?: string
          insight_data?: Json
          insight_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_insights_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "user_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_processing_log: {
        Row: {
          completed_at: string | null
          document_id: string
          error_message: string | null
          id: string
          processing_steps: Json | null
          started_at: string
          status: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          document_id: string
          error_message?: string | null
          id?: string
          processing_steps?: Json | null
          started_at?: string
          status: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          document_id?: string
          error_message?: string | null
          id?: string
          processing_steps?: Json | null
          started_at?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_processing_log_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "user_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_document"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "user_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          action_taken: string | null
          created_at: string | null
          feedback_score: number | null
          id: string
          insight: string | null
          metric: string
          user_id: string | null
        }
        Insert: {
          action_taken?: string | null
          created_at?: string | null
          feedback_score?: number | null
          id?: string
          insight?: string | null
          metric: string
          user_id?: string | null
        }
        Update: {
          action_taken?: string | null
          created_at?: string | null
          feedback_score?: number | null
          id?: string
          insight?: string | null
          metric?: string
          user_id?: string | null
        }
        Relationships: []
      }
      function_execution_log: {
        Row: {
          completed_at: string | null
          duration_ms: number | null
          error_message: string | null
          function_name: string
          id: string
          metadata: Json | null
          started_at: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          function_name: string
          id?: string
          metadata?: Json | null
          started_at?: string | null
          status: string
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          function_name?: string
          id?: string
          metadata?: Json | null
          started_at?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      health_anomalies: {
        Row: {
          acknowledged_at: string | null
          anomaly_type: string
          baseline_value: number | null
          current_value: number | null
          detected_at: string | null
          deviation_percent: number | null
          id: string
          metric_name: string
          notes: string | null
          severity: string
          user_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          anomaly_type: string
          baseline_value?: number | null
          current_value?: number | null
          detected_at?: string | null
          deviation_percent?: number | null
          id?: string
          metric_name: string
          notes?: string | null
          severity: string
          user_id: string
        }
        Update: {
          acknowledged_at?: string | null
          anomaly_type?: string
          baseline_value?: number | null
          current_value?: number | null
          detected_at?: string | null
          deviation_percent?: number | null
          id?: string
          metric_name?: string
          notes?: string | null
          severity?: string
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
      health_trends_daily: {
        Row: {
          baseline: number | null
          created_at: string | null
          delta: number | null
          id: string
          metric_name: string
          period_date: string
          trend_direction: string | null
          updated_at: string | null
          user_id: string
          value: number | null
        }
        Insert: {
          baseline?: number | null
          created_at?: string | null
          delta?: number | null
          id?: string
          metric_name: string
          period_date: string
          trend_direction?: string | null
          updated_at?: string | null
          user_id: string
          value?: number | null
        }
        Update: {
          baseline?: number | null
          created_at?: string | null
          delta?: number | null
          id?: string
          metric_name?: string
          period_date?: string
          trend_direction?: string | null
          updated_at?: string | null
          user_id?: string
          value?: number | null
        }
        Relationships: []
      }
      health_trends_weekly: {
        Row: {
          baseline: number | null
          created_at: string | null
          delta: number | null
          id: string
          metric_name: string
          period_end: string
          period_start: string
          trend_direction: string | null
          updated_at: string | null
          user_id: string
          value: number | null
          week_over_week_pct: number | null
        }
        Insert: {
          baseline?: number | null
          created_at?: string | null
          delta?: number | null
          id?: string
          metric_name: string
          period_end: string
          period_start: string
          trend_direction?: string | null
          updated_at?: string | null
          user_id: string
          value?: number | null
          week_over_week_pct?: number | null
        }
        Update: {
          baseline?: number | null
          created_at?: string | null
          delta?: number | null
          id?: string
          metric_name?: string
          period_end?: string
          period_start?: string
          trend_direction?: string | null
          updated_at?: string | null
          user_id?: string
          value?: number | null
          week_over_week_pct?: number | null
        }
        Relationships: []
      }
      insight_feedback: {
        Row: {
          action_taken: string | null
          created_at: string | null
          feedback_score: number | null
          id: string
          insight: string | null
          metric: string | null
          user_id: string | null
        }
        Insert: {
          action_taken?: string | null
          created_at?: string | null
          feedback_score?: number | null
          id?: string
          insight?: string | null
          metric?: string | null
          user_id?: string | null
        }
        Update: {
          action_taken?: string | null
          created_at?: string | null
          feedback_score?: number | null
          id?: string
          insight?: string | null
          metric?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      insight_history: {
        Row: {
          context_used: string | null
          created_at: string
          id: string
          provider: string | null
          query: string
          response: string
          response_quality: number | null
          user_id: string
        }
        Insert: {
          context_used?: string | null
          created_at?: string
          id?: string
          provider?: string | null
          query: string
          response: string
          response_quality?: number | null
          user_id: string
        }
        Update: {
          context_used?: string | null
          created_at?: string
          id?: string
          provider?: string | null
          query?: string
          response?: string
          response_quality?: number | null
          user_id?: string
        }
        Relationships: []
      }
      medical_finder_sessions: {
        Row: {
          created_at: string
          current_step: string
          data: Json
          id: string
          last_updated_at: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_step?: string
          data?: Json
          id?: string
          last_updated_at?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_step?: string
          data?: Json
          id?: string
          last_updated_at?: string
          status?: string
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
      oura_logs: {
        Row: {
          created_at: string | null
          entries_synced: number | null
          error_message: string | null
          id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          entries_synced?: number | null
          error_message?: string | null
          id?: string
          status: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          entries_synced?: number | null
          error_message?: string | null
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      oura_sync_log: {
        Row: {
          data: Json | null
          date_used: string | null
          endpoint: string | null
          fetched_at: string | null
          id: number
          user_id: string | null
        }
        Insert: {
          data?: Json | null
          date_used?: string | null
          endpoint?: string | null
          fetched_at?: string | null
          id?: number
          user_id?: string | null
        }
        Update: {
          data?: Json | null
          date_used?: string | null
          endpoint?: string | null
          fetched_at?: string | null
          id?: number
          user_id?: string | null
        }
        Relationships: []
      }
      physicians: {
        Row: {
          accepting_new_patients: boolean | null
          address: string | null
          availability: string | null
          city: string | null
          cost_tier: string | null
          created_at: string
          education: string | null
          email: string | null
          hospital_affiliations: string[] | null
          id: string
          insurance_accepted: string[] | null
          languages: string[] | null
          location: string | null
          name: string
          phone: string | null
          rating: number | null
          specialty: string
          state: string | null
          sub_specialty: string | null
          telehealth_available: boolean | null
          updated_at: string
          verified: boolean | null
          years_experience: number | null
          zip_code: string | null
        }
        Insert: {
          accepting_new_patients?: boolean | null
          address?: string | null
          availability?: string | null
          city?: string | null
          cost_tier?: string | null
          created_at?: string
          education?: string | null
          email?: string | null
          hospital_affiliations?: string[] | null
          id?: string
          insurance_accepted?: string[] | null
          languages?: string[] | null
          location?: string | null
          name: string
          phone?: string | null
          rating?: number | null
          specialty: string
          state?: string | null
          sub_specialty?: string | null
          telehealth_available?: boolean | null
          updated_at?: string
          verified?: boolean | null
          years_experience?: number | null
          zip_code?: string | null
        }
        Update: {
          accepting_new_patients?: boolean | null
          address?: string | null
          availability?: string | null
          city?: string | null
          cost_tier?: string | null
          created_at?: string
          education?: string | null
          email?: string | null
          hospital_affiliations?: string[] | null
          id?: string
          insurance_accepted?: string[] | null
          languages?: string[] | null
          location?: string | null
          name?: string
          phone?: string | null
          rating?: number | null
          specialty?: string
          state?: string | null
          sub_specialty?: string | null
          telehealth_available?: boolean | null
          updated_at?: string
          verified?: boolean | null
          years_experience?: number | null
          zip_code?: string | null
        }
        Relationships: []
      }
      plan_adherence: {
        Row: {
          actual_data: Json | null
          adherence_score: number | null
          created_at: string | null
          date: string
          deviation_reasons: string[] | null
          expected_data: Json | null
          id: string
          plan_type: string | null
          user_id: string
        }
        Insert: {
          actual_data?: Json | null
          adherence_score?: number | null
          created_at?: string | null
          date: string
          deviation_reasons?: string[] | null
          expected_data?: Json | null
          id?: string
          plan_type?: string | null
          user_id: string
        }
        Update: {
          actual_data?: Json | null
          adherence_score?: number | null
          created_at?: string | null
          date?: string
          deviation_reasons?: string[] | null
          expected_data?: Json | null
          id?: string
          plan_type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          full_name: string | null
          id: string
          memory_cleared_at: string | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          full_name?: string | null
          id: string
          memory_cleared_at?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          full_name?: string | null
          id?: string
          memory_cleared_at?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      rate_limit_state: {
        Row: {
          is_throttled: boolean | null
          last_request_at: string | null
          provider: string
          request_count: number | null
          throttle_until: string | null
          updated_at: string | null
          user_id: string
          window_start: string | null
        }
        Insert: {
          is_throttled?: boolean | null
          last_request_at?: string | null
          provider?: string
          request_count?: number | null
          throttle_until?: string | null
          updated_at?: string | null
          user_id: string
          window_start?: string | null
        }
        Update: {
          is_throttled?: boolean | null
          last_request_at?: string | null
          provider?: string
          request_count?: number | null
          throttle_until?: string | null
          updated_at?: string | null
          user_id?: string
          window_start?: string | null
        }
        Relationships: []
      }
      recovery_trends: {
        Row: {
          acute_load: number | null
          acwr: number | null
          acwr_trend: string | null
          chronic_load: number | null
          created_at: string | null
          id: string
          monotony: number | null
          period_date: string
          recovery_score: number | null
          strain: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          acute_load?: number | null
          acwr?: number | null
          acwr_trend?: string | null
          chronic_load?: number | null
          created_at?: string | null
          id?: string
          monotony?: number | null
          period_date: string
          recovery_score?: number | null
          strain?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          acute_load?: number | null
          acwr?: number | null
          acwr_trend?: string | null
          chronic_load?: number | null
          created_at?: string | null
          id?: string
          monotony?: number | null
          period_date?: string
          recovery_score?: number | null
          strain?: number | null
          updated_at?: string | null
          user_id?: string
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
      symptom_check_ins: {
        Row: {
          body_location: string | null
          created_at: string
          description: string | null
          duration_hours: number | null
          id: string
          onset_time: string | null
          related_metrics: Json | null
          severity: string
          symptom_type: string
          triggers: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          body_location?: string | null
          created_at?: string
          description?: string | null
          duration_hours?: number | null
          id?: string
          onset_time?: string | null
          related_metrics?: Json | null
          severity: string
          symptom_type: string
          triggers?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          body_location?: string | null
          created_at?: string
          description?: string | null
          duration_hours?: number | null
          id?: string
          onset_time?: string | null
          related_metrics?: Json | null
          severity?: string
          symptom_type?: string
          triggers?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sync_health_log: {
        Row: {
          created_at: string | null
          entries_processed: number | null
          error_code: string | null
          error_message: string | null
          id: string
          latency_ms: number | null
          retry_count: number | null
          status: string
          sync_type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          entries_processed?: number | null
          error_code?: string | null
          error_message?: string | null
          id?: string
          latency_ms?: number | null
          retry_count?: number | null
          status: string
          sync_type?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          entries_processed?: number | null
          error_code?: string | null
          error_message?: string | null
          id?: string
          latency_ms?: number | null
          retry_count?: number | null
          status?: string
          sync_type?: string
          user_id?: string
        }
        Relationships: []
      }
      sync_retry_queue: {
        Row: {
          created_at: string | null
          id: string
          last_error: string | null
          max_retries: number | null
          next_retry_at: string | null
          operation: string
          payload: Json | null
          retry_count: number | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_error?: string | null
          max_retries?: number | null
          next_retry_at?: string | null
          operation: string
          payload?: Json | null
          retry_count?: number | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          last_error?: string | null
          max_retries?: number | null
          next_retry_at?: string | null
          operation?: string
          payload?: Json | null
          retry_count?: number | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
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
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      training_trends: {
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
          sleep_score: number | null
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
          sleep_score?: number | null
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
          sleep_score?: number | null
          strain?: number | null
          training_load?: number | null
          user_id?: string
        }
        Relationships: []
      }
      triage_results: {
        Row: {
          action_taken: string | null
          confidence_score: number
          contextual_factors: Json | null
          created_at: string
          data_sources_used: string[] | null
          flags: string[] | null
          id: string
          issue_type: string
          outcome_feedback: string | null
          reasoning: string
          recommended_provider: string
          severity: string
          updated_at: string
          user_id: string
        }
        Insert: {
          action_taken?: string | null
          confidence_score: number
          contextual_factors?: Json | null
          created_at?: string
          data_sources_used?: string[] | null
          flags?: string[] | null
          id?: string
          issue_type: string
          outcome_feedback?: string | null
          reasoning: string
          recommended_provider: string
          severity: string
          updated_at?: string
          user_id: string
        }
        Update: {
          action_taken?: string | null
          confidence_score?: number
          contextual_factors?: Json | null
          created_at?: string
          data_sources_used?: string[] | null
          flags?: string[] | null
          id?: string
          issue_type?: string
          outcome_feedback?: string | null
          reasoning?: string
          recommended_provider?: string
          severity?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_baselines: {
        Row: {
          data_window: number
          deviation_threshold: number | null
          metric: string
          rolling_avg: number
          updated_at: string
          user_id: string
        }
        Insert: {
          data_window: number
          deviation_threshold?: number | null
          metric: string
          rolling_avg: number
          updated_at?: string
          user_id: string
        }
        Update: {
          data_window?: number
          deviation_threshold?: number | null
          metric?: string
          rolling_avg?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_context_enhanced: {
        Row: {
          last_updated: string | null
          medical_profile: Json | null
          nutrition_profile: Json | null
          training_profile: Json | null
          user_id: string
        }
        Insert: {
          last_updated?: string | null
          medical_profile?: Json | null
          nutrition_profile?: Json | null
          training_profile?: Json | null
          user_id: string
        }
        Update: {
          last_updated?: string | null
          medical_profile?: Json | null
          nutrition_profile?: Json | null
          training_profile?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      user_deviations: {
        Row: {
          baseline_value: number | null
          created_at: string | null
          current_value: number | null
          date: string | null
          deviation: number | null
          id: string
          metric: string
          risk_zone: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          baseline_value?: number | null
          created_at?: string | null
          current_value?: number | null
          date?: string | null
          deviation?: number | null
          id?: string
          metric: string
          risk_zone?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          baseline_value?: number | null
          created_at?: string | null
          current_value?: number | null
          date?: string | null
          deviation?: number | null
          id?: string
          metric?: string
          risk_zone?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_documents: {
        Row: {
          ai_summary: string | null
          document_type: string
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          parsed_content: Json | null
          processing_status: string | null
          tags: string[] | null
          uploaded_at: string | null
          user_id: string
        }
        Insert: {
          ai_summary?: string | null
          document_type: string
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          parsed_content?: Json | null
          processing_status?: string | null
          tags?: string[] | null
          uploaded_at?: string | null
          user_id: string
        }
        Update: {
          ai_summary?: string | null
          document_type?: string
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          parsed_content?: Json | null
          processing_status?: string | null
          tags?: string[] | null
          uploaded_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_health_profiles: {
        Row: {
          ai_synthesis: string | null
          generated_at: string | null
          id: string
          profile_data: Json
          user_id: string
          version: number | null
        }
        Insert: {
          ai_synthesis?: string | null
          generated_at?: string | null
          id?: string
          profile_data?: Json
          user_id: string
          version?: number | null
        }
        Update: {
          ai_synthesis?: string | null
          generated_at?: string | null
          id?: string
          profile_data?: Json
          user_id?: string
          version?: number | null
        }
        Relationships: []
      }
      user_injuries: {
        Row: {
          created_at: string | null
          id: string
          injuries: string[] | null
          injury_details: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          injuries?: string[] | null
          injury_details?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          injuries?: string[] | null
          injury_details?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_insight_actions: {
        Row: {
          acknowledged_at: string | null
          action_taken: string | null
          feedback_score: number | null
          id: string
          insight: string | null
          metric: string
          suggestion: string | null
          user_id: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          action_taken?: string | null
          feedback_score?: number | null
          id?: string
          insight?: string | null
          metric: string
          suggestion?: string | null
          user_id?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          action_taken?: string | null
          feedback_score?: number | null
          id?: string
          insight?: string | null
          metric?: string
          suggestion?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_insight_actions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_interests: {
        Row: {
          created_at: string | null
          hobbies: string[] | null
          id: string
          interests: string[] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          hobbies?: string[] | null
          id?: string
          interests?: string[] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          hobbies?: string[] | null
          id?: string
          interests?: string[] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_lifestyle: {
        Row: {
          created_at: string | null
          daily_routine: string | null
          id: string
          stress_level: string | null
          updated_at: string | null
          user_id: string
          work_schedule: string | null
        }
        Insert: {
          created_at?: string | null
          daily_routine?: string | null
          id?: string
          stress_level?: string | null
          updated_at?: string | null
          user_id: string
          work_schedule?: string | null
        }
        Update: {
          created_at?: string | null
          daily_routine?: string | null
          id?: string
          stress_level?: string | null
          updated_at?: string | null
          user_id?: string
          work_schedule?: string | null
        }
        Relationships: []
      }
      user_medical: {
        Row: {
          conditions: string[] | null
          created_at: string | null
          id: string
          medical_notes: string | null
          medications: string[] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          conditions?: string[] | null
          created_at?: string | null
          id?: string
          medical_notes?: string | null
          medications?: string[] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          conditions?: string[] | null
          created_at?: string | null
          id?: string
          medical_notes?: string | null
          medications?: string[] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_mindset: {
        Row: {
          created_at: string | null
          id: string
          mental_health_focus: string | null
          motivation_factors: string[] | null
          stress_management: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          mental_health_focus?: string | null
          motivation_factors?: string[] | null
          stress_management?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          mental_health_focus?: string | null
          motivation_factors?: string[] | null
          stress_management?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_nutrition: {
        Row: {
          allergies: string[] | null
          created_at: string | null
          diet_type: string | null
          eating_pattern: string | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          allergies?: string[] | null
          created_at?: string | null
          diet_type?: string | null
          eating_pattern?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          allergies?: string[] | null
          created_at?: string | null
          diet_type?: string | null
          eating_pattern?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_profile: {
        Row: {
          activity_level: string | null
          conditions: string[] | null
          created_at: string | null
          dob: string | null
          gender: string | null
          goals: string[] | null
          injuries: string[] | null
          name: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          activity_level?: string | null
          conditions?: string[] | null
          created_at?: string | null
          dob?: string | null
          gender?: string | null
          goals?: string[] | null
          injuries?: string[] | null
          name?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          activity_level?: string | null
          conditions?: string[] | null
          created_at?: string | null
          dob?: string | null
          gender?: string | null
          goals?: string[] | null
          injuries?: string[] | null
          name?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_recovery: {
        Row: {
          created_at: string | null
          id: string
          recovery_methods: string[] | null
          sleep_hours: number | null
          sleep_quality: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          recovery_methods?: string[] | null
          sleep_hours?: number | null
          sleep_quality?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          recovery_methods?: string[] | null
          sleep_hours?: number | null
          sleep_quality?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_training: {
        Row: {
          created_at: string | null
          id: string
          intensity_preference: string | null
          preferred_activities: string[] | null
          training_frequency: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          intensity_preference?: string | null
          preferred_activities?: string[] | null
          training_frequency?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          intensity_preference?: string | null
          preferred_activities?: string[] | null
          training_frequency?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_wellness_goals: {
        Row: {
          created_at: string | null
          goals: string[] | null
          id: string
          priority: string | null
          target_date: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          goals?: string[] | null
          id?: string
          priority?: string | null
          target_date?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          goals?: string[] | null
          id?: string
          priority?: string | null
          target_date?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          connected_at: string | null
          created_at: string | null
          email: string | null
          email_preferences: Json | null
          fitbit_connected: boolean | null
          fitbit_user_id: string | null
          id: string
          refresh_token: string | null
        }
        Insert: {
          connected_at?: string | null
          created_at?: string | null
          email?: string | null
          email_preferences?: Json | null
          fitbit_connected?: boolean | null
          fitbit_user_id?: string | null
          id?: string
          refresh_token?: string | null
        }
        Update: {
          connected_at?: string | null
          created_at?: string | null
          email?: string | null
          email_preferences?: Json | null
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
      wearable_auto_data: {
        Row: {
          activity: Json | null
          date: string | null
          fetched_at: string | null
          id: number
          sleep: Json | null
          user_id: string
        }
        Insert: {
          activity?: Json | null
          date?: string | null
          fetched_at?: string | null
          id?: number
          sleep?: Json | null
          user_id: string
        }
        Update: {
          activity?: Json | null
          date?: string | null
          fetched_at?: string | null
          id?: number
          sleep?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      wearable_sessions: {
        Row: {
          active_calories: number | null
          activity_score: number | null
          date: string
          fetched_at: string | null
          hrv_avg: number | null
          id: string
          readiness_score: number | null
          resting_hr: number | null
          sleep_score: number | null
          source: string
          spo2_avg: number | null
          total_calories: number | null
          total_steps: number | null
          user_id: string
        }
        Insert: {
          active_calories?: number | null
          activity_score?: number | null
          date: string
          fetched_at?: string | null
          hrv_avg?: number | null
          id?: string
          readiness_score?: number | null
          resting_hr?: number | null
          sleep_score?: number | null
          source: string
          spo2_avg?: number | null
          total_calories?: number | null
          total_steps?: number | null
          user_id: string
        }
        Update: {
          active_calories?: number | null
          activity_score?: number | null
          date?: string
          fetched_at?: string | null
          hrv_avg?: number | null
          id?: string
          readiness_score?: number | null
          resting_hr?: number | null
          sleep_score?: number | null
          source?: string
          spo2_avg?: number | null
          total_calories?: number | null
          total_steps?: number | null
          user_id?: string
        }
        Relationships: []
      }
      wearable_summary: {
        Row: {
          acwr: number | null
          avg_sleep_score: number | null
          date: string
          id: string
          monotony: number | null
          readiness_index: number | null
          source: string
          strain: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          acwr?: number | null
          avg_sleep_score?: number | null
          date: string
          id?: string
          monotony?: number | null
          readiness_index?: number | null
          source: string
          strain?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          acwr?: number | null
          avg_sleep_score?: number | null
          date?: string
          id?: string
          monotony?: number | null
          readiness_index?: number | null
          source?: string
          strain?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      wearable_tokens: {
        Row: {
          access_token: string
          access_token_encrypted: string | null
          created_at: string | null
          encryption_version: number | null
          expires_at: string | null
          expires_in: number | null
          fitbit_user_id: string | null
          refresh_token: string | null
          refresh_token_encrypted: string | null
          scope: string | null
          token_type: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token: string
          access_token_encrypted?: string | null
          created_at?: string | null
          encryption_version?: number | null
          expires_at?: string | null
          expires_in?: number | null
          fitbit_user_id?: string | null
          refresh_token?: string | null
          refresh_token_encrypted?: string | null
          scope?: string | null
          token_type?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string
          access_token_encrypted?: string | null
          created_at?: string | null
          encryption_version?: number | null
          expires_at?: string | null
          expires_in?: number | null
          fitbit_user_id?: string | null
          refresh_token?: string | null
          refresh_token_encrypted?: string | null
          scope?: string | null
          token_type?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
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
      yves_feedback: {
        Row: {
          comment: string | null
          created_at: string | null
          feedback: string | null
          id: string
          recommendation_id: string | null
          user_id: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          feedback?: string | null
          id?: string
          recommendation_id?: string | null
          user_id?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          feedback?: string | null
          id?: string
          recommendation_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "yves_feedback_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "adaptive_recommendations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yves_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      yves_memory_bank: {
        Row: {
          created_at: string
          id: string
          last_updated: string
          memory_key: string
          memory_value: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_updated?: string
          memory_key: string
          memory_value: Json
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_updated?: string
          memory_key?: string
          memory_value?: Json
          user_id?: string
        }
        Relationships: []
      }
      yves_profiles: {
        Row: {
          baseline_value: number
          current_value: number
          deviation_pct: number
          metric: string
          reasoning: string | null
          risk_status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          baseline_value: number
          current_value: number
          deviation_pct: number
          metric: string
          reasoning?: string | null
          risk_status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          baseline_value?: number
          current_value?: number
          deviation_pct?: number
          metric?: string
          reasoning?: string | null
          risk_status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      yves_recommendations: {
        Row: {
          acknowledged_at: string | null
          category: string
          created_at: string
          feedback_score: number | null
          id: string
          priority: string | null
          recommendation_text: string
          source: string | null
          user_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          category: string
          created_at?: string
          feedback_score?: number | null
          id?: string
          priority?: string | null
          recommendation_text: string
          source?: string | null
          user_id: string
        }
        Update: {
          acknowledged_at?: string | null
          category?: string
          created_at?: string
          feedback_score?: number | null
          id?: string
          priority?: string | null
          recommendation_text?: string
          source?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      feedback_summary: {
        Row: {
          avg_score: number | null
          metric: string | null
          total_feedback: number | null
        }
        Relationships: []
      }
      insight_engagement_summary: {
        Row: {
          engagement_rate: number | null
          feedback_count: number | null
          insight_count: number | null
          metric: string | null
        }
        Relationships: []
      }
      oura_tokens: {
        Row: {
          access_token: string | null
          created_at: string | null
          expires_at: string | null
          refresh_token: string | null
          scope: string | null
          user_id: string | null
        }
        Insert: {
          access_token?: string | null
          created_at?: string | null
          expires_at?: string | null
          refresh_token?: string | null
          scope?: string | null
          user_id?: string | null
        }
        Update: {
          access_token?: string | null
          created_at?: string | null
          expires_at?: string | null
          refresh_token?: string | null
          scope?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_insights_view: {
        Row: {
          deviation_pct: number | null
          insight: string | null
          metric: string | null
          risk_status: string | null
          suggestion: string | null
          updated_at: string | null
        }
        Insert: {
          deviation_pct?: number | null
          insight?: string | null
          metric?: string | null
          risk_status?: string | null
          suggestion?: string | null
          updated_at?: string | null
        }
        Update: {
          deviation_pct?: number | null
          insight?: string | null
          metric?: string | null
          risk_status?: string | null
          suggestion?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      yves_timeline_view: {
        Row: {
          baseline_value: number | null
          current_value: number | null
          deviation: number | null
          generated_at: string | null
          metric: string | null
          recommendation: string | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_latest_insights: {
        Args: never
        Returns: {
          deviation_pct: number
          insight: string
          metric: string
          risk_status: string
          suggestion: string
          updated_at: string
        }[]
      }
      strip_tokens_from_activity: { Args: { u_id: string }; Returns: undefined }
      update_user_context: {
        Args: { p_data: Json; p_field: string; p_user_id: string }
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
