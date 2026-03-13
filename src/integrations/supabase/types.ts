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
      accountability_challenges: {
        Row: {
          challenge_type: string
          created_at: string | null
          current_value: number
          description: string | null
          end_date: string
          id: string
          start_date: string
          status: string
          target_value: number
          title: string
          unit: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          challenge_type?: string
          created_at?: string | null
          current_value?: number
          description?: string | null
          end_date: string
          id?: string
          start_date?: string
          status?: string
          target_value?: number
          title: string
          unit?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          challenge_type?: string
          created_at?: string | null
          current_value?: number
          description?: string | null
          end_date?: string
          id?: string
          start_date?: string
          status?: string
          target_value?: number
          title?: string
          unit?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
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
      alert_history: {
        Row: {
          alert_type: string
          created_at: string | null
          dismissed_at: string | null
          health_anomaly_id: string | null
          id: string
          message: string
          metric_name: string
          metric_value: number
          resolved_at: string | null
          severity: string
          snooze_count: number | null
          snoozed_until: string | null
          status: string | null
          symptom_checkin_id: string | null
          threshold_value: number
          updated_at: string | null
          user_id: string
          user_notes: string | null
        }
        Insert: {
          alert_type: string
          created_at?: string | null
          dismissed_at?: string | null
          health_anomaly_id?: string | null
          id?: string
          message: string
          metric_name: string
          metric_value: number
          resolved_at?: string | null
          severity: string
          snooze_count?: number | null
          snoozed_until?: string | null
          status?: string | null
          symptom_checkin_id?: string | null
          threshold_value: number
          updated_at?: string | null
          user_id: string
          user_notes?: string | null
        }
        Update: {
          alert_type?: string
          created_at?: string | null
          dismissed_at?: string | null
          health_anomaly_id?: string | null
          id?: string
          message?: string
          metric_name?: string
          metric_value?: number
          resolved_at?: string | null
          severity?: string
          snooze_count?: number | null
          snoozed_until?: string | null
          status?: string | null
          symptom_checkin_id?: string | null
          threshold_value?: number
          updated_at?: string | null
          user_id?: string
          user_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alert_history_health_anomaly_id_fkey"
            columns: ["health_anomaly_id"]
            isOneToOne: false
            referencedRelation: "health_anomalies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alert_history_symptom_checkin_id_fkey"
            columns: ["symptom_checkin_id"]
            isOneToOne: false
            referencedRelation: "symptom_check_ins"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_settings: {
        Row: {
          acwr_critical_threshold: number | null
          alert_notifications_enabled: boolean
          briefing_enabled: boolean
          briefing_time: string
          created_at: string | null
          enable_email_alerts: boolean | null
          enable_popup_alerts: boolean | null
          enable_sms_alerts: boolean | null
          hrv_drop_threshold: number | null
          id: string
          max_snooze_count: number | null
          monotony_critical_threshold: number | null
          readiness_score_threshold: number | null
          rhr_spike_threshold: number | null
          severity_filter: string | null
          sleep_score_threshold: number | null
          strain_critical_threshold: number | null
          training_context: string | null
          updated_at: string | null
          user_id: string
          weekly_summary_enabled: boolean
        }
        Insert: {
          acwr_critical_threshold?: number | null
          alert_notifications_enabled?: boolean
          briefing_enabled?: boolean
          briefing_time?: string
          created_at?: string | null
          enable_email_alerts?: boolean | null
          enable_popup_alerts?: boolean | null
          enable_sms_alerts?: boolean | null
          hrv_drop_threshold?: number | null
          id?: string
          max_snooze_count?: number | null
          monotony_critical_threshold?: number | null
          readiness_score_threshold?: number | null
          rhr_spike_threshold?: number | null
          severity_filter?: string | null
          sleep_score_threshold?: number | null
          strain_critical_threshold?: number | null
          training_context?: string | null
          updated_at?: string | null
          user_id: string
          weekly_summary_enabled?: boolean
        }
        Update: {
          acwr_critical_threshold?: number | null
          alert_notifications_enabled?: boolean
          briefing_enabled?: boolean
          briefing_time?: string
          created_at?: string | null
          enable_email_alerts?: boolean | null
          enable_popup_alerts?: boolean | null
          enable_sms_alerts?: boolean | null
          hrv_drop_threshold?: number | null
          id?: string
          max_snooze_count?: number | null
          monotony_critical_threshold?: number | null
          readiness_score_threshold?: number | null
          rhr_spike_threshold?: number | null
          severity_filter?: string | null
          sleep_score_threshold?: number | null
          strain_critical_threshold?: number | null
          training_context?: string | null
          updated_at?: string | null
          user_id?: string
          weekly_summary_enabled?: boolean
        }
        Relationships: []
      }
      Bookings: {
        Row: {
          appointment_end: string | null
          appointment_start: string | null
          calendly_event_id: string | null
          clinician_id: string | null
          created_at: string | null
          id: string
          notes: string | null
          patient_email: string | null
          patient_name: string | null
          session_date: string
          session_type: string | null
          source: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          appointment_end?: string | null
          appointment_start?: string | null
          calendly_event_id?: string | null
          clinician_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          patient_email?: string | null
          patient_name?: string | null
          session_date?: string
          session_type?: string | null
          source?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          appointment_end?: string | null
          appointment_start?: string | null
          calendly_event_id?: string | null
          clinician_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          patient_email?: string | null
          patient_name?: string | null
          session_date?: string
          session_type?: string | null
          source?: string | null
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
          focus_context: Json | null
          focus_mode: string
          generation_id: string | null
          id: string
          refresh_nonce: string | null
          user_id: string
        }
        Insert: {
          category?: string | null
          content: string
          context_used?: Json | null
          created_at?: string | null
          date: string
          focus_context?: Json | null
          focus_mode?: string
          generation_id?: string | null
          id?: string
          refresh_nonce?: string | null
          user_id: string
        }
        Update: {
          category?: string | null
          content?: string
          context_used?: Json | null
          created_at?: string | null
          date?: string
          focus_context?: Json | null
          focus_mode?: string
          generation_id?: string | null
          id?: string
          refresh_nonce?: string | null
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
      document_versions: {
        Row: {
          ai_summary: string | null
          created_at: string
          document_id: string
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          parsed_content: Json | null
          processing_status: string | null
          restored_from_version: number | null
          tags: string[] | null
          user_id: string
          version_number: number
        }
        Insert: {
          ai_summary?: string | null
          created_at?: string
          document_id: string
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          parsed_content?: Json | null
          processing_status?: string | null
          restored_from_version?: number | null
          tags?: string[] | null
          user_id: string
          version_number: number
        }
        Update: {
          ai_summary?: string | null
          created_at?: string
          document_id?: string
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          parsed_content?: Json | null
          processing_status?: string | null
          restored_from_version?: number | null
          tags?: string[] | null
          user_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "user_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      engagement_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          target_id: string | null
          target_type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          target_id?: string | null
          target_type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          target_id?: string | null
          target_type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      escalation_log: {
        Row: {
          acknowledged_at: string | null
          action_taken: string | null
          created_at: string
          escalation_type: string
          id: string
          message: string
          rule_id: string | null
          rule_name: string
          severity: string
          triggered_conditions: Json | null
          user_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          action_taken?: string | null
          created_at?: string
          escalation_type: string
          id?: string
          message: string
          rule_id?: string | null
          rule_name: string
          severity: string
          triggered_conditions?: Json | null
          user_id: string
        }
        Update: {
          acknowledged_at?: string | null
          action_taken?: string | null
          created_at?: string
          escalation_type?: string
          id?: string
          message?: string
          rule_id?: string | null
          rule_name?: string
          severity?: string
          triggered_conditions?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "escalation_log_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "escalation_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      escalation_rules: {
        Row: {
          conditions: Json
          cooldown_hours: number
          created_at: string
          description: string | null
          enabled: boolean
          escalation_type: string
          id: string
          message_template: string
          require_all: boolean
          rule_name: string
          severity: string
          updated_at: string
        }
        Insert: {
          conditions?: Json
          cooldown_hours?: number
          created_at?: string
          description?: string | null
          enabled?: boolean
          escalation_type: string
          id?: string
          message_template: string
          require_all?: boolean
          rule_name: string
          severity?: string
          updated_at?: string
        }
        Update: {
          conditions?: Json
          cooldown_hours?: number
          created_at?: string
          description?: string | null
          enabled?: boolean
          escalation_type?: string
          id?: string
          message_template?: string
          require_all?: boolean
          rule_name?: string
          severity?: string
          updated_at?: string
        }
        Relationships: []
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
      garmin_oauth_state: {
        Row: {
          code_verifier: string
          created_at: string
          expires_at: string
          id: string
          state: string
          user_id: string
        }
        Insert: {
          code_verifier: string
          created_at?: string
          expires_at?: string
          id?: string
          state: string
          user_id: string
        }
        Update: {
          code_verifier?: string
          created_at?: string
          expires_at?: string
          id?: string
          state?: string
          user_id?: string
        }
        Relationships: []
      }
      google_calendar_events: {
        Row: {
          attendees: Json | null
          calendar_id: string
          created_at: string | null
          description: string | null
          end_time: string
          google_event_id: string
          id: string
          location: string | null
          raw_data: Json | null
          start_time: string
          status: string | null
          summary: string | null
          synced_to_planner: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          attendees?: Json | null
          calendar_id: string
          created_at?: string | null
          description?: string | null
          end_time: string
          google_event_id: string
          id?: string
          location?: string | null
          raw_data?: Json | null
          start_time: string
          status?: string | null
          summary?: string | null
          synced_to_planner?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          attendees?: Json | null
          calendar_id?: string
          created_at?: string | null
          description?: string | null
          end_time?: string
          google_event_id?: string
          id?: string
          location?: string | null
          raw_data?: Json | null
          start_time?: string
          status?: string | null
          summary?: string | null
          synced_to_planner?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      google_calendar_sync_logs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          events_synced: number | null
          id: string
          started_at: string | null
          status: string
          sync_type: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          events_synced?: number | null
          id?: string
          started_at?: string | null
          status?: string
          sync_type?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          events_synced?: number | null
          id?: string
          started_at?: string | null
          status?: string
          sync_type?: string
          user_id?: string
        }
        Relationships: []
      }
      google_calendar_tokens: {
        Row: {
          access_token: string
          created_at: string | null
          expires_at: string
          id: string
          refresh_token: string | null
          scope: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string | null
          expires_at: string
          id?: string
          refresh_token?: string | null
          scope?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          refresh_token?: string | null
          scope?: string
          updated_at?: string | null
          user_id?: string
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
      healthcare_practitioners: {
        Row: {
          accepts_medical_aid: boolean | null
          available_times: Json | null
          bio: string | null
          calendly_url: string | null
          city: string | null
          consultation_fee: number | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string | null
          full_name: string
          id: string
          languages: string[] | null
          location: string
          online_available: boolean | null
          profile_image_url: string | null
          province: string | null
          qualifications: string[] | null
          rating: number | null
          specialty: string
          title: string
          updated_at: string | null
          years_experience: number | null
        }
        Insert: {
          accepts_medical_aid?: boolean | null
          available_times?: Json | null
          bio?: string | null
          calendly_url?: string | null
          city?: string | null
          consultation_fee?: number | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          full_name: string
          id?: string
          languages?: string[] | null
          location: string
          online_available?: boolean | null
          profile_image_url?: string | null
          province?: string | null
          qualifications?: string[] | null
          rating?: number | null
          specialty: string
          title: string
          updated_at?: string | null
          years_experience?: number | null
        }
        Update: {
          accepts_medical_aid?: boolean | null
          available_times?: Json | null
          bio?: string | null
          calendly_url?: string | null
          city?: string | null
          consultation_fee?: number | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          full_name?: string
          id?: string
          languages?: string[] | null
          location?: string
          online_available?: boolean | null
          profile_image_url?: string | null
          province?: string | null
          qualifications?: string[] | null
          rating?: number | null
          specialty?: string
          title?: string
          updated_at?: string | null
          years_experience?: number | null
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
          calendly_url: string | null
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
          review_count: number | null
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
          calendly_url?: string | null
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
          review_count?: number | null
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
          calendly_url?: string | null
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
          review_count?: number | null
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
      practitioner_access: {
        Row: {
          access_granted_at: string
          created_at: string
          id: string
          is_active: boolean
          patient_id: string
          practitioner_email: string
          practitioner_id: string | null
          practitioner_name: string | null
          practitioner_type: "physio" | "coach" | "doctor" | "trainer" | "other" | null
          updated_at: string
        }
        Insert: {
          access_granted_at?: string
          created_at?: string
          id?: string
          is_active?: boolean
          patient_id: string
          practitioner_email: string
          practitioner_id?: string | null
          practitioner_name?: string | null
          practitioner_type?: "physio" | "coach" | "doctor" | "trainer" | "other" | null
          updated_at?: string
        }
        Update: {
          access_granted_at?: string
          created_at?: string
          id?: string
          is_active?: boolean
          patient_id?: string
          practitioner_email?: string
          practitioner_id?: string | null
          practitioner_name?: string | null
          practitioner_type?: "physio" | "coach" | "doctor" | "trainer" | "other" | null
          updated_at?: string
        }
        Relationships: []
      }
      practitioner_specialties: {
        Row: {
          created_at: string | null
          id: string
          practitioner_id: string
          proficiency_level: string | null
          service_category_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          practitioner_id: string
          proficiency_level?: string | null
          service_category_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          practitioner_id?: string
          proficiency_level?: string | null
          service_category_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "practitioner_specialties_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "healthcare_practitioners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practitioner_specialties_service_category_id_fkey"
            columns: ["service_category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          accepts_medical_aid: boolean | null
          address: string | null
          avatar_url: string | null
          bio: string | null
          city: string | null
          full_name: string | null
          id: string
          in_person: boolean | null
          layout_preferences: Json | null
          listing_active: boolean | null
          memory_cleared_at: string | null
          niche_tags: string[] | null
          practice_name: string | null
          pricing_tier: string | null
          province: string | null
          qualifications: string[] | null
          registration_body: string | null
          registration_number: string | null
          requires_deposit: boolean | null
          role: string | null
          session_fee_max: number | null
          session_fee_min: number | null
          specialty: string | null
          suburb: string | null
          telehealth: boolean | null
          timezone: string | null
          tone_preference: string | null
          updated_at: string | null
          username: string | null
          years_experience: number | null
        }
        Insert: {
          accepts_medical_aid?: boolean | null
          address?: string | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          full_name?: string | null
          id: string
          in_person?: boolean | null
          layout_preferences?: Json | null
          listing_active?: boolean | null
          memory_cleared_at?: string | null
          niche_tags?: string[] | null
          practice_name?: string | null
          pricing_tier?: string | null
          province?: string | null
          qualifications?: string[] | null
          registration_body?: string | null
          registration_number?: string | null
          requires_deposit?: boolean | null
          role?: string | null
          session_fee_max?: number | null
          session_fee_min?: number | null
          specialty?: string | null
          suburb?: string | null
          telehealth?: boolean | null
          timezone?: string | null
          tone_preference?: string | null
          updated_at?: string | null
          username?: string | null
          years_experience?: number | null
        }
        Update: {
          accepts_medical_aid?: boolean | null
          address?: string | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          full_name?: string | null
          id?: string
          in_person?: boolean | null
          layout_preferences?: Json | null
          listing_active?: boolean | null
          memory_cleared_at?: string | null
          niche_tags?: string[] | null
          practice_name?: string | null
          pricing_tier?: string | null
          province?: string | null
          qualifications?: string[] | null
          registration_body?: string | null
          registration_number?: string | null
          requires_deposit?: boolean | null
          role?: string | null
          session_fee_max?: number | null
          session_fee_min?: number | null
          specialty?: string | null
          suburb?: string | null
          telehealth?: boolean | null
          timezone?: string | null
          tone_preference?: string | null
          updated_at?: string | null
          username?: string | null
          years_experience?: number | null
        }
        Relationships: []
      }
      prompt_history: {
        Row: {
          created_at: string
          id: string
          priority: string | null
          prompt_content: string | null
          prompt_type: string
          user_id: string
          was_acted_upon: boolean | null
          was_helpful: boolean | null
        }
        Insert: {
          created_at?: string
          id?: string
          priority?: string | null
          prompt_content?: string | null
          prompt_type: string
          user_id: string
          was_acted_upon?: boolean | null
          was_helpful?: boolean | null
        }
        Update: {
          created_at?: string
          id?: string
          priority?: string | null
          prompt_content?: string | null
          prompt_type?: string
          user_id?: string
          was_acted_upon?: boolean | null
          was_helpful?: boolean | null
        }
        Relationships: []
      }
      provider_reviews: {
        Row: {
          created_at: string
          helpful_count: number
          id: string
          physician_id: string
          rating: number
          review_text: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          helpful_count?: number
          id?: string
          physician_id: string
          rating: number
          review_text?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          helpful_count?: number
          id?: string
          physician_id?: string
          rating?: number
          review_text?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_reviews_physician_id_fkey"
            columns: ["physician_id"]
            isOneToOne: false
            referencedRelation: "physicians"
            referencedColumns: ["id"]
          },
        ]
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
      rate_limits: {
        Row: {
          count: number
          created_at: string | null
          id: string
          key: string
          reset_at: string
          updated_at: string | null
        }
        Insert: {
          count?: number
          created_at?: string | null
          id?: string
          key: string
          reset_at: string
          updated_at?: string | null
        }
        Update: {
          count?: number
          created_at?: string | null
          id?: string
          key?: string
          reset_at?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      recommendation_outcomes: {
        Row: {
          created_at: string
          id: string
          measured_at: string
          metrics_after: Json | null
          metrics_before: Json | null
          notes: string | null
          outcome_delta: Json | null
          outcome_type: string
          recommendation_id: string
          user_feedback: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          measured_at?: string
          metrics_after?: Json | null
          metrics_before?: Json | null
          notes?: string | null
          outcome_delta?: Json | null
          outcome_type: string
          recommendation_id: string
          user_feedback?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          measured_at?: string
          metrics_after?: Json | null
          metrics_before?: Json | null
          notes?: string | null
          outcome_delta?: Json | null
          outcome_type?: string
          recommendation_id?: string
          user_feedback?: string | null
          user_id?: string
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
          data_gap: boolean
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
          data_gap?: boolean
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
          data_gap?: boolean
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
      review_helpful_votes: {
        Row: {
          created_at: string
          id: string
          review_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          review_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          review_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_helpful_votes_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "provider_reviews"
            referencedColumns: ["id"]
          },
        ]
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
      risk_alert_dismissals: {
        Row: {
          alert_key: string
          created_at: string
          dismissed_at: string
          id: string
          snooze_until: string | null
          user_id: string
        }
        Insert: {
          alert_key: string
          created_at?: string
          dismissed_at?: string
          id?: string
          snooze_until?: string | null
          user_id: string
        }
        Update: {
          alert_key?: string
          created_at?: string
          dismissed_at?: string
          id?: string
          snooze_until?: string | null
          user_id?: string
        }
        Relationships: []
      }
      risk_trajectories: {
        Row: {
          baseline_value: number | null
          calculation_date: string
          confidence: number | null
          created_at: string
          current_value: number | null
          id: string
          metric: string
          predicted_3day: number | null
          predicted_7day: number | null
          trajectory_direction: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          baseline_value?: number | null
          calculation_date?: string
          confidence?: number | null
          created_at?: string
          current_value?: number | null
          id?: string
          metric: string
          predicted_3day?: number | null
          predicted_7day?: number | null
          trajectory_direction?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          baseline_value?: number | null
          calculation_date?: string
          confidence?: number | null
          created_at?: string
          current_value?: number | null
          id?: string
          metric?: string
          predicted_3day?: number | null
          predicted_7day?: number | null
          trajectory_direction?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      service_categories: {
        Row: {
          created_at: string | null
          description: string | null
          display_name: string
          icon: string | null
          id: string
          name: string
          typical_cost_range_max: number | null
          typical_cost_range_min: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_name: string
          icon?: string | null
          id?: string
          name: string
          typical_cost_range_max?: number | null
          typical_cost_range_min?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_name?: string
          icon?: string | null
          id?: string
          name?: string
          typical_cost_range_max?: number | null
          typical_cost_range_min?: number | null
        }
        Relationships: []
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
      risk_score_history: {
        Row: {
          calculated_at: string
          component_scores: Json
          created_at: string
          id: string
          score: number
          user_id: string
        }
        Insert: {
          calculated_at?: string
          component_scores?: Json
          created_at?: string
          id?: string
          score: number
          user_id: string
        }
        Update: {
          calculated_at?: string
          component_scores?: Json
          created_at?: string
          id?: string
          score?: number
          user_id?: string
        }
        Relationships: []
      }
      training_trends: {
        Row: {
          acute_load: number | null
          acwr: number | null
          chronic_load: number | null
          created_at: string | null
          data_gap: boolean
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
          data_gap?: boolean
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
          data_gap?: boolean
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
      treatment_plan_feedback: {
        Row: {
          created_at: string | null
          feedback_text: string | null
          id: string
          improvements_needed: string[] | null
          rating: number | null
          treatment_plan_id: string
          user_id: string
          was_helpful: boolean | null
        }
        Insert: {
          created_at?: string | null
          feedback_text?: string | null
          id?: string
          improvements_needed?: string[] | null
          rating?: number | null
          treatment_plan_id: string
          user_id: string
          was_helpful?: boolean | null
        }
        Update: {
          created_at?: string | null
          feedback_text?: string | null
          id?: string
          improvements_needed?: string[] | null
          rating?: number | null
          treatment_plan_id?: string
          user_id?: string
          was_helpful?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "treatment_plan_feedback_treatment_plan_id_fkey"
            columns: ["treatment_plan_id"]
            isOneToOne: false
            referencedRelation: "treatment_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      treatment_plan_services: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          evidence_level: string | null
          frequency: string | null
          id: string
          price_per_session: number
          rationale: string | null
          service_category_id: string
          sessions: number
          treatment_plan_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          evidence_level?: string | null
          frequency?: string | null
          id?: string
          price_per_session: number
          rationale?: string | null
          service_category_id: string
          sessions?: number
          treatment_plan_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          evidence_level?: string | null
          frequency?: string | null
          id?: string
          price_per_session?: number
          rationale?: string | null
          service_category_id?: string
          sessions?: number
          treatment_plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "treatment_plan_services_service_category_id_fkey"
            columns: ["service_category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_plan_services_treatment_plan_id_fkey"
            columns: ["treatment_plan_id"]
            isOneToOne: false
            referencedRelation: "treatment_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      treatment_plans: {
        Row: {
          analyzed_symptoms: string[] | null
          complexity_score: number | null
          created_at: string | null
          description: string | null
          goal: string | null
          id: string
          is_favorite: boolean | null
          match_score: number | null
          name: string
          plan_type: string
          status: string | null
          time_frame: string | null
          total_cost: number
          updated_at: string | null
          user_id: string
          user_input: string | null
        }
        Insert: {
          analyzed_symptoms?: string[] | null
          complexity_score?: number | null
          created_at?: string | null
          description?: string | null
          goal?: string | null
          id?: string
          is_favorite?: boolean | null
          match_score?: number | null
          name: string
          plan_type: string
          status?: string | null
          time_frame?: string | null
          total_cost?: number
          updated_at?: string | null
          user_id: string
          user_input?: string | null
        }
        Update: {
          analyzed_symptoms?: string[] | null
          complexity_score?: number | null
          created_at?: string | null
          description?: string | null
          goal?: string | null
          id?: string
          is_favorite?: boolean | null
          match_score?: number | null
          name?: string
          plan_type?: string
          status?: string | null
          time_frame?: string | null
          total_cost?: number
          updated_at?: string | null
          user_id?: string
          user_input?: string | null
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
      user_adaptation_profile: {
        Row: {
          avg_response_time_hours: number | null
          created_at: string
          effective_tone: string | null
          follow_through_rate: number | null
          id: string
          last_adapted: string
          optimal_timing: Json | null
          preferred_categories: Json | null
          threshold_adjustments: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avg_response_time_hours?: number | null
          created_at?: string
          effective_tone?: string | null
          follow_through_rate?: number | null
          id?: string
          last_adapted?: string
          optimal_timing?: Json | null
          preferred_categories?: Json | null
          threshold_adjustments?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avg_response_time_hours?: number | null
          created_at?: string
          effective_tone?: string | null
          follow_through_rate?: number | null
          id?: string
          last_adapted?: string
          optimal_timing?: Json | null
          preferred_categories?: Json | null
          threshold_adjustments?: Json | null
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
      user_challenges: {
        Row: {
          accepted_at: string | null
          challenge_description: string | null
          challenge_title: string
          challenge_type: string
          completed_at: string | null
          created_at: string | null
          current_progress: number | null
          id: string
          status: string | null
          target_value: number | null
          user_id: string
          week_start_date: string
        }
        Insert: {
          accepted_at?: string | null
          challenge_description?: string | null
          challenge_title: string
          challenge_type: string
          completed_at?: string | null
          created_at?: string | null
          current_progress?: number | null
          id?: string
          status?: string | null
          target_value?: number | null
          user_id: string
          week_start_date: string
        }
        Update: {
          accepted_at?: string | null
          challenge_description?: string | null
          challenge_title?: string
          challenge_type?: string
          completed_at?: string | null
          created_at?: string | null
          current_progress?: number | null
          id?: string
          status?: string | null
          target_value?: number | null
          user_id?: string
          week_start_date?: string
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
      user_data_maturity: {
        Row: {
          created_at: string
          data_days: number
          documents_count: number
          id: string
          last_calculated: string
          maturity_level: string
          maturity_score: number
          profile_completeness: number
          symptom_checkins_count: number
          updated_at: string
          user_id: string
          wearable_connected: boolean
        }
        Insert: {
          created_at?: string
          data_days?: number
          documents_count?: number
          id?: string
          last_calculated?: string
          maturity_level?: string
          maturity_score?: number
          profile_completeness?: number
          symptom_checkins_count?: number
          updated_at?: string
          user_id: string
          wearable_connected?: boolean
        }
        Update: {
          created_at?: string
          data_days?: number
          documents_count?: number
          id?: string
          last_calculated?: string
          maturity_level?: string
          maturity_score?: number
          profile_completeness?: number
          symptom_checkins_count?: number
          updated_at?: string
          user_id?: string
          wearable_connected?: boolean
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
          is_latest: boolean
          parent_document_id: string | null
          parsed_content: Json | null
          processing_status: string | null
          tags: string[] | null
          uploaded_at: string | null
          user_id: string
          version: number
          version_notes: string | null
        }
        Insert: {
          ai_summary?: string | null
          document_type: string
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          is_latest?: boolean
          parent_document_id?: string | null
          parsed_content?: Json | null
          processing_status?: string | null
          tags?: string[] | null
          uploaded_at?: string | null
          user_id: string
          version?: number
          version_notes?: string | null
        }
        Update: {
          ai_summary?: string | null
          document_type?: string
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          is_latest?: boolean
          parent_document_id?: string | null
          parsed_content?: Json | null
          processing_status?: string | null
          tags?: string[] | null
          uploaded_at?: string | null
          user_id?: string
          version?: number
          version_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_documents_parent_document_id_fkey"
            columns: ["parent_document_id"]
            isOneToOne: false
            referencedRelation: "user_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      user_focus_preferences: {
        Row: {
          created_at: string | null
          custom_emphasis: Json | null
          focus_mode: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          custom_emphasis?: Json | null
          focus_mode?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          custom_emphasis?: Json | null
          focus_mode?: string
          updated_at?: string | null
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
      user_profiles: {
        Row: {
          alert_notifications_enabled: boolean
          avatar_url: string | null
          bio: string | null
          briefing_enabled: boolean
          briefing_time: string
          created_at: string | null
          date_of_birth: string | null
          experience_level: string | null
          full_name: string | null
          id: string
          onboarding_completed: boolean | null
          onboarding_skipped: boolean | null
          onboarding_step: number | null
          phone_number: string | null
          position: string | null
          primary_goal: string | null
          sport: string | null
          updated_at: string | null
          user_id: string
          weekly_summary_enabled: boolean
          weekly_training_hours: number | null
        }
        Insert: {
          alert_notifications_enabled?: boolean
          avatar_url?: string | null
          bio?: string | null
          briefing_enabled?: boolean
          briefing_time?: string
          created_at?: string | null
          date_of_birth?: string | null
          experience_level?: string | null
          full_name?: string | null
          id?: string
          onboarding_completed?: boolean | null
          onboarding_skipped?: boolean | null
          onboarding_step?: number | null
          phone_number?: string | null
          position?: string | null
          primary_goal?: string | null
          sport?: string | null
          updated_at?: string | null
          user_id: string
          weekly_summary_enabled?: boolean
          weekly_training_hours?: number | null
        }
        Update: {
          alert_notifications_enabled?: boolean
          avatar_url?: string | null
          bio?: string | null
          briefing_enabled?: boolean
          briefing_time?: string
          created_at?: string | null
          date_of_birth?: string | null
          experience_level?: string | null
          full_name?: string | null
          id?: string
          onboarding_completed?: boolean | null
          onboarding_skipped?: boolean | null
          onboarding_step?: number | null
          phone_number?: string | null
          position?: string | null
          primary_goal?: string | null
          sport?: string | null
          updated_at?: string | null
          user_id?: string
          weekly_summary_enabled?: boolean
          weekly_training_hours?: number | null
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
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_shown_patterns: {
        Row: {
          category: string
          created_at: string | null
          id: string
          pattern_id: string
          pattern_text: string
          shown_at: string
          tone: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string | null
          id?: string
          pattern_id: string
          pattern_text: string
          shown_at?: string
          tone: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string | null
          id?: string
          pattern_id?: string
          pattern_text?: string
          shown_at?: string
          tone?: string
          user_id?: string
        }
        Relationships: []
      }
      user_training: {
        Row: {
          created_at: string | null
          equipment_access: string[] | null
          id: string
          intensity_preference: string | null
          preferred_activities: string[] | null
          training_frequency: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          equipment_access?: string[] | null
          id?: string
          intensity_preference?: string | null
          preferred_activities?: string[] | null
          training_frequency?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          equipment_access?: string[] | null
          id?: string
          intensity_preference?: string | null
          preferred_activities?: string[] | null
          training_frequency?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_treatment_preferences: {
        Row: {
          allergies: string[] | null
          chronic_conditions: string[] | null
          created_at: string | null
          current_medications: string[] | null
          id: string
          max_budget_monthly: number | null
          medical_aid_provider: string | null
          prefer_online: boolean | null
          preferred_gender: string | null
          preferred_languages: string[] | null
          preferred_location: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          allergies?: string[] | null
          chronic_conditions?: string[] | null
          created_at?: string | null
          current_medications?: string[] | null
          id?: string
          max_budget_monthly?: number | null
          medical_aid_provider?: string | null
          prefer_online?: boolean | null
          preferred_gender?: string | null
          preferred_languages?: string[] | null
          preferred_location?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          allergies?: string[] | null
          chronic_conditions?: string[] | null
          created_at?: string | null
          current_medications?: string[] | null
          id?: string
          max_budget_monthly?: number | null
          medical_aid_provider?: string | null
          prefer_online?: boolean | null
          preferred_gender?: string | null
          preferred_languages?: string[] | null
          preferred_location?: string | null
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
          deep_sleep_duration: number | null
          fetched_at: string | null
          hrv_avg: number | null
          id: string
          light_sleep_duration: number | null
          readiness_score: number | null
          rem_sleep_duration: number | null
          resting_hr: number | null
          running_distance_km: number | null
          sleep_efficiency: number | null
          sleep_score: number | null
          source: string
          spo2_avg: number | null
          total_calories: number | null
          total_distance_km: number | null
          total_sleep_duration: number | null
          total_steps: number | null
          user_id: string
        }
        Insert: {
          active_calories?: number | null
          activity_score?: number | null
          date: string
          deep_sleep_duration?: number | null
          fetched_at?: string | null
          hrv_avg?: number | null
          id?: string
          light_sleep_duration?: number | null
          readiness_score?: number | null
          rem_sleep_duration?: number | null
          resting_hr?: number | null
          running_distance_km?: number | null
          sleep_efficiency?: number | null
          sleep_score?: number | null
          source: string
          spo2_avg?: number | null
          total_calories?: number | null
          total_distance_km?: number | null
          total_sleep_duration?: number | null
          total_steps?: number | null
          user_id: string
        }
        Update: {
          active_calories?: number | null
          activity_score?: number | null
          date?: string
          deep_sleep_duration?: number | null
          fetched_at?: string | null
          hrv_avg?: number | null
          id?: string
          light_sleep_duration?: number | null
          readiness_score?: number | null
          rem_sleep_duration?: number | null
          resting_hr?: number | null
          running_distance_km?: number | null
          sleep_efficiency?: number | null
          sleep_score?: number | null
          source?: string
          spo2_avg?: number | null
          total_calories?: number | null
          total_distance_km?: number | null
          total_sleep_duration?: number | null
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
          scope: string
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
          scope?: string
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
          scope?: string
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
      weekly_reflections: {
        Row: {
          challenges: string | null
          created_at: string | null
          highlights: string | null
          id: string
          notes: string | null
          rating: number
          user_id: string
          week_end_date: string
          week_start_date: string
        }
        Insert: {
          challenges?: string | null
          created_at?: string | null
          highlights?: string | null
          id?: string
          notes?: string | null
          rating: number
          user_id: string
          week_end_date: string
          week_start_date: string
        }
        Update: {
          challenges?: string | null
          created_at?: string | null
          highlights?: string | null
          id?: string
          notes?: string | null
          rating?: number
          user_id?: string
          week_end_date?: string
          week_start_date?: string
        }
        Relationships: []
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
          confidence: number | null
          confidence_breakdown: Json | null
          created_at: string
          data_sources: string[] | null
          feedback_score: number | null
          id: string
          internal_reasoning: string | null
          priority: string | null
          recommendation_text: string
          source: string | null
          user_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          category: string
          confidence?: number | null
          confidence_breakdown?: Json | null
          created_at?: string
          data_sources?: string[] | null
          feedback_score?: number | null
          id?: string
          internal_reasoning?: string | null
          priority?: string | null
          recommendation_text: string
          source?: string | null
          user_id: string
        }
        Update: {
          acknowledged_at?: string | null
          category?: string
          confidence?: number | null
          confidence_breakdown?: Json | null
          created_at?: string
          data_sources?: string[] | null
          feedback_score?: number | null
          id?: string
          internal_reasoning?: string | null
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
      cleanup_expired_garmin_oauth_state: { Args: never; Returns: undefined }
      cleanup_expired_rate_limits: { Args: never; Returns: undefined }
      cleanup_old_pattern_views: { Args: never; Returns: undefined }
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      restore_document_version: {
        Args: {
          p_document_id: string
          p_user_id: string
          p_version_number: number
        }
        Returns: Json
      }
      strip_tokens_from_activity: { Args: { u_id: string }; Returns: undefined }
      update_user_context: {
        Args: { p_data: Json; p_field: string; p_user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
