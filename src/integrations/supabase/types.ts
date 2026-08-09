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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_is_admin: boolean
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json
          target_user_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_is_admin?: boolean
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json
          target_user_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_is_admin?: boolean
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json
          target_user_id?: string | null
        }
        Relationships: []
      }
      coin_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string
          id: string
          reference_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string
          id?: string
          reference_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          id?: string
          reference_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_polls: {
        Row: {
          created_at: string
          id: string
          options: Json
          poll_date: string
          question: string
          reward_coins: number
        }
        Insert: {
          created_at?: string
          id?: string
          options?: Json
          poll_date: string
          question: string
          reward_coins?: number
        }
        Update: {
          created_at?: string
          id?: string
          options?: Json
          poll_date?: string
          question?: string
          reward_coins?: number
        }
        Relationships: []
      }
      kyc_verifications: {
        Row: {
          admin_note: string | null
          country: string
          date_of_birth: string
          document_reference: string
          document_type: string
          full_name: string
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          country: string
          date_of_birth: string
          document_reference: string
          document_type: string
          full_name: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          country?: string
          date_of_birth?: string
          document_reference?: string
          document_type?: string
          full_name?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string
          user_id?: string
        }
        Relationships: []
      }
      network_signals: {
        Row: {
          context: string
          country: string | null
          created_at: string
          id: string
          ip_hash: string
          is_hosting: boolean
          is_proxy: boolean
          is_tor: boolean
          is_vpn: boolean
          user_id: string | null
        }
        Insert: {
          context?: string
          country?: string | null
          created_at?: string
          id?: string
          ip_hash: string
          is_hosting?: boolean
          is_proxy?: boolean
          is_tor?: boolean
          is_vpn?: boolean
          user_id?: string | null
        }
        Update: {
          context?: string
          country?: string | null
          created_at?: string
          id?: string
          ip_hash?: string
          is_hosting?: boolean
          is_proxy?: boolean
          is_tor?: boolean
          is_vpn?: boolean
          user_id?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          icon: string
          id: string
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          icon?: string
          id?: string
          read?: boolean
          title: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          icon?: string
          id?: string
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      offer_activations: {
        Row: {
          activated_at: string
          id: string
          offer_id: string
          reward_coins: number
          user_id: string
        }
        Insert: {
          activated_at?: string
          id?: string
          offer_id: string
          reward_coins?: number
          user_id: string
        }
        Update: {
          activated_at?: string
          id?: string
          offer_id?: string
          reward_coins?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "offer_activations_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          cashback_percent: number
          category: string
          created_at: string
          created_by: string | null
          description: string
          id: string
          logo_url: string | null
          merchant: string
          reward_coins: number
          title: string
        }
        Insert: {
          cashback_percent?: number
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          logo_url?: string | null
          merchant: string
          reward_coins?: number
          title: string
        }
        Update: {
          cashback_percent?: number
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          logo_url?: string | null
          merchant?: string
          reward_coins?: number
          title?: string
        }
        Relationships: []
      }
      payout_batch_items: {
        Row: {
          batch_id: string
          coins_amount: number
          created_at: string
          error: string | null
          id: string
          status: string
          user_id: string
          withdrawal_id: string
        }
        Insert: {
          batch_id: string
          coins_amount: number
          created_at?: string
          error?: string | null
          id?: string
          status?: string
          user_id: string
          withdrawal_id: string
        }
        Update: {
          batch_id?: string
          coins_amount?: number
          created_at?: string
          error?: string | null
          id?: string
          status?: string
          user_id?: string
          withdrawal_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payout_batch_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "payout_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payout_batch_items_withdrawal_id_fkey"
            columns: ["withdrawal_id"]
            isOneToOne: false
            referencedRelation: "withdrawals"
            referencedColumns: ["id"]
          },
        ]
      }
      payout_batches: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          item_count: number
          label: string
          note: string | null
          processed_at: string | null
          processed_by: string | null
          scheduled_for: string | null
          status: string
          total_coins: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          item_count?: number
          label: string
          note?: string | null
          processed_at?: string | null
          processed_by?: string | null
          scheduled_for?: string | null
          status?: string
          total_coins?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          item_count?: number
          label?: string
          note?: string | null
          processed_at?: string | null
          processed_by?: string | null
          scheduled_for?: string | null
          status?: string
          total_coins?: number
          updated_at?: string
        }
        Relationships: []
      }
      poll_votes: {
        Row: {
          id: string
          option_index: number
          poll_id: string
          user_id: string
          voted_at: string
        }
        Insert: {
          id?: string
          option_index: number
          poll_id: string
          user_id: string
          voted_at?: string
        }
        Update: {
          id?: string
          option_index?: number
          poll_id?: string
          user_id?: string
          voted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "daily_polls"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_status: string
          age_range: string | null
          avatar_url: string | null
          background_completed: boolean
          background_updated_at: string | null
          country: string | null
          created_at: string
          daily_streak: number
          display_name: string | null
          education: string | null
          employment_status: string | null
          gender: string | null
          has_kids: boolean | null
          id: string
          income_range: string | null
          industry: string | null
          interests: string[] | null
          job_title: string | null
          kyc_status: string
          last_active_date: string | null
          last_ip_hash: string | null
          last_seen_at: string | null
          marital_status: string | null
          referral_code: string | null
          referred_by: string | null
          risk_score: number
          shopping_habits: string[] | null
          suspended_reason: string | null
          user_id: string
          vpn_checked_at: string | null
          vpn_flagged: boolean
        }
        Insert: {
          account_status?: string
          age_range?: string | null
          avatar_url?: string | null
          background_completed?: boolean
          background_updated_at?: string | null
          country?: string | null
          created_at?: string
          daily_streak?: number
          display_name?: string | null
          education?: string | null
          employment_status?: string | null
          gender?: string | null
          has_kids?: boolean | null
          id?: string
          income_range?: string | null
          industry?: string | null
          interests?: string[] | null
          job_title?: string | null
          kyc_status?: string
          last_active_date?: string | null
          last_ip_hash?: string | null
          last_seen_at?: string | null
          marital_status?: string | null
          referral_code?: string | null
          referred_by?: string | null
          risk_score?: number
          shopping_habits?: string[] | null
          suspended_reason?: string | null
          user_id: string
          vpn_checked_at?: string | null
          vpn_flagged?: boolean
        }
        Update: {
          account_status?: string
          age_range?: string | null
          avatar_url?: string | null
          background_completed?: boolean
          background_updated_at?: string | null
          country?: string | null
          created_at?: string
          daily_streak?: number
          display_name?: string | null
          education?: string | null
          employment_status?: string | null
          gender?: string | null
          has_kids?: boolean | null
          id?: string
          income_range?: string | null
          industry?: string | null
          interests?: string[] | null
          job_title?: string | null
          kyc_status?: string
          last_active_date?: string | null
          last_ip_hash?: string | null
          last_seen_at?: string | null
          marital_status?: string | null
          referral_code?: string | null
          referred_by?: string | null
          risk_score?: number
          shopping_habits?: string[] | null
          suspended_reason?: string | null
          user_id?: string
          vpn_checked_at?: string | null
          vpn_flagged?: boolean
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          action: string
          count: number
          id: string
          user_id: string
          window_start: string
        }
        Insert: {
          action: string
          count?: number
          id?: string
          user_id: string
          window_start: string
        }
        Update: {
          action?: string
          count?: number
          id?: string
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      redemptions: {
        Row: {
          cost_coins: number
          id: string
          redeemed_at: string
          reward_id: string
          status: string
          user_id: string
        }
        Insert: {
          cost_coins: number
          id?: string
          redeemed_at?: string
          reward_id: string
          status?: string
          user_id: string
        }
        Update: {
          cost_coins?: number
          id?: string
          redeemed_at?: string
          reward_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "redemptions_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "rewards"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          bonus_paid: boolean
          created_at: string
          id: string
          referred_id: string
          referrer_id: string
        }
        Insert: {
          bonus_paid?: boolean
          created_at?: string
          id?: string
          referred_id: string
          referrer_id: string
        }
        Update: {
          bonus_paid?: boolean
          created_at?: string
          id?: string
          referred_id?: string
          referrer_id?: string
        }
        Relationships: []
      }
      rewards: {
        Row: {
          brand: string
          cash_value_cents: number
          category: string
          cost_coins: number
          created_at: string
          created_by: string | null
          id: string
          image_url: string | null
          name: string
        }
        Insert: {
          brand?: string
          cash_value_cents: number
          category?: string
          cost_coins: number
          created_at?: string
          created_by?: string | null
          id?: string
          image_url?: string | null
          name: string
        }
        Update: {
          brand?: string
          cash_value_cents?: number
          category?: string
          cost_coins?: number
          created_at?: string
          created_by?: string | null
          id?: string
          image_url?: string | null
          name?: string
        }
        Relationships: []
      }
      security_events: {
        Row: {
          created_at: string
          detail: Json
          event_type: string
          id: string
          resolved: boolean
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          detail?: Json
          event_type: string
          id?: string
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          detail?: Json
          event_type?: string
          id?: string
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          user_id?: string | null
        }
        Relationships: []
      }
      survey_claims: {
        Row: {
          id: string
          link_opened_at: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          reward_cents: number
          screener_answers: Json
          status: string
          submitted_at: string
          survey_id: string
          tracking_uid: string | null
          user_id: string
        }
        Insert: {
          id?: string
          link_opened_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reward_cents?: number
          screener_answers?: Json
          status?: string
          submitted_at?: string
          survey_id: string
          tracking_uid?: string | null
          user_id: string
        }
        Update: {
          id?: string
          link_opened_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reward_cents?: number
          screener_answers?: Json
          status?: string
          submitted_at?: string
          survey_id?: string
          tracking_uid?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_claims_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_completions: {
        Row: {
          answers: Json
          completed_at: string
          id: string
          reward_cents: number
          survey_id: string
          user_id: string
        }
        Insert: {
          answers?: Json
          completed_at?: string
          id?: string
          reward_cents?: number
          survey_id: string
          user_id: string
        }
        Update: {
          answers?: Json
          completed_at?: string
          id?: string
          reward_cents?: number
          survey_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_completions_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_screener_keys: {
        Row: {
          correct_answers: Json
          survey_id: string
          updated_at: string
        }
        Insert: {
          correct_answers?: Json
          survey_id: string
          updated_at?: string
        }
        Update: {
          correct_answers?: Json
          survey_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_screener_keys_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: true
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      surveys: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          description: string
          estimated_minutes: number
          external_url: string | null
          id: string
          questions: Json
          reward_cents: number
          screener_questions: Json
          target_age_ranges: string[]
          target_audience: string
          target_countries: string[]
          target_education: string[]
          target_employment_statuses: string[]
          target_genders: string[]
          target_has_kids: string
          target_income_ranges: string[]
          target_marital_statuses: string[]
          title: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          description: string
          estimated_minutes?: number
          external_url?: string | null
          id?: string
          questions?: Json
          reward_cents?: number
          screener_questions?: Json
          target_age_ranges?: string[]
          target_audience?: string
          target_countries?: string[]
          target_education?: string[]
          target_employment_statuses?: string[]
          target_genders?: string[]
          target_has_kids?: string
          target_income_ranges?: string[]
          target_marital_statuses?: string[]
          title: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string
          estimated_minutes?: number
          external_url?: string | null
          id?: string
          questions?: Json
          reward_cents?: number
          screener_questions?: Json
          target_age_ranges?: string[]
          target_audience?: string
          target_countries?: string[]
          target_education?: string[]
          target_employment_statuses?: string[]
          target_genders?: string[]
          target_has_kids?: string
          target_income_ranges?: string[]
          target_marital_statuses?: string[]
          title?: string
        }
        Relationships: []
      }
      user_devices: {
        Row: {
          fingerprint: string
          first_seen_at: string
          id: string
          ip_hash: string | null
          last_seen_at: string
          platform: string
          timezone: string
          user_agent: string
          user_id: string
        }
        Insert: {
          fingerprint: string
          first_seen_at?: string
          id?: string
          ip_hash?: string | null
          last_seen_at?: string
          platform?: string
          timezone?: string
          user_agent?: string
          user_id: string
        }
        Update: {
          fingerprint?: string
          first_seen_at?: string
          id?: string
          ip_hash?: string | null
          last_seen_at?: string
          platform?: string
          timezone?: string
          user_agent?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      video_watches: {
        Row: {
          id: string
          reward_coins: number
          user_id: string
          video_id: string
          watched_at: string
        }
        Insert: {
          id?: string
          reward_coins?: number
          user_id: string
          video_id: string
          watched_at?: string
        }
        Update: {
          id?: string
          reward_coins?: number
          user_id?: string
          video_id?: string
          watched_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_watches_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      videos: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          description: string
          duration_seconds: number
          id: string
          reward_coins: number
          thumbnail_url: string | null
          title: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string
          duration_seconds?: number
          id?: string
          reward_coins?: number
          thumbnail_url?: string | null
          title: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string
          duration_seconds?: number
          id?: string
          reward_coins?: number
          thumbnail_url?: string | null
          title?: string
        }
        Relationships: []
      }
      withdrawals: {
        Row: {
          admin_note: string | null
          cash_value_cents: number
          coins_amount: number
          created_at: string
          destination: string
          id: string
          method: string
          processed_at: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          cash_value_cents: number
          coins_amount: number
          created_at?: string
          destination: string
          id?: string
          method: string
          processed_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          cash_value_cents?: number
          coins_amount?: number
          created_at?: string
          destination?: string
          id?: string
          method?: string
          processed_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      weekly_leaderboard: {
        Row: {
          avatar_url: string | null
          coins_earned: number | null
          display_name: string | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_adjust_coins: {
        Args: { _amount: number; _reason: string; _user_id: string }
        Returns: undefined
      }
      admin_bulk_adjust_coins: {
        Args: { _amount: number; _reason: string; _user_ids: string[] }
        Returns: Json
      }
      admin_bulk_review_survey_claims: {
        Args: { _approve: boolean; _ids: string[] }
        Returns: Json
      }
      admin_bulk_review_withdrawals: {
        Args: { _approve: boolean; _ids: string[]; _note?: string }
        Returns: Json
      }
      admin_cancel_payout_batch: {
        Args: { _batch_id: string }
        Returns: undefined
      }
      admin_create_payout_batch: {
        Args: {
          _label: string
          _scheduled_for?: string
          _withdrawal_ids: string[]
        }
        Returns: string
      }
      admin_earnings_report: {
        Args: { _threshold_cents?: number; _year: number }
        Returns: {
          adjustments_cents: number
          balance_cents: number
          country: string
          display_name: string
          gross_earned_cents: number
          kyc_status: string
          paid_out_cents: number
          pending_cents: number
          reportable: boolean
          user_id: string
        }[]
      }
      admin_platform_stats: { Args: never; Returns: Json }
      admin_resolve_security_event: {
        Args: { _event_id: string }
        Returns: undefined
      }
      admin_review_kyc: {
        Args: { _approve: boolean; _kyc_id: string; _note?: string }
        Returns: undefined
      }
      admin_review_survey_claim: {
        Args: { _approve: boolean; _claim_id: string }
        Returns: undefined
      }
      admin_review_withdrawal: {
        Args: { _approve: boolean; _note?: string; _withdrawal_id: string }
        Returns: undefined
      }
      admin_run_payout_batch: { Args: { _batch_id: string }; Returns: Json }
      admin_set_account_status: {
        Args: { _reason?: string; _status: string; _user_id: string }
        Returns: undefined
      }
      admin_set_admin_role: {
        Args: { _grant: boolean; _user_id: string }
        Returns: undefined
      }
      admin_set_user_role: {
        Args: { _grant: boolean; _role: string; _user_id: string }
        Returns: undefined
      }
      award_offer_activation: { Args: { _offer_id: string }; Returns: number }
      award_video_watch: { Args: { _video_id: string }; Returns: number }
      claim_daily_streak: { Args: never; Returns: Json }
      claim_referral: { Args: { _ref_code: string }; Returns: boolean }
      complete_in_app_survey: {
        Args: { _answers: Json; _survey_id: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_staff_role: {
        Args: { _roles: string[]; _user_id: string }
        Returns: boolean
      }
      internal_audit: {
        Args: {
          _action: string
          _entity_id?: string
          _entity_type?: string
          _metadata?: Json
          _target_user_id?: string
        }
        Returns: undefined
      }
      internal_award_coins: {
        Args: {
          _amount: number
          _description: string
          _notify?: boolean
          _reference_id?: string
          _type: string
          _user_id: string
        }
        Returns: undefined
      }
      internal_log_security_event: {
        Args: {
          _detail?: Json
          _event_type: string
          _severity?: string
          _user_id: string
        }
        Returns: undefined
      }
      internal_rate_limit: {
        Args: {
          _action: string
          _max: number
          _user_id: string
          _window: string
        }
        Returns: undefined
      }
      internal_record_network_signal: {
        Args: {
          _context: string
          _country: string
          _ip_hash: string
          _is_hosting: boolean
          _is_proxy: boolean
          _is_tor: boolean
          _is_vpn: boolean
          _user_id: string
        }
        Returns: undefined
      }
      internal_require_active: {
        Args: { _user_id: string }
        Returns: undefined
      }
      internal_require_admin: { Args: never; Returns: string }
      internal_require_staff: { Args: { _roles: string[] }; Returns: string }
      internal_run_payout_batch: {
        Args: { _actor: string; _batch_id: string }
        Returns: Json
      }
      internal_settle_survey_claim: {
        Args: { _actor: string; _approve: boolean; _claim_id: string }
        Returns: undefined
      }
      internal_settle_withdrawal: {
        Args: {
          _actor: string
          _approve: boolean
          _note: string
          _withdrawal_id: string
        }
        Returns: undefined
      }
      my_earnings_report: { Args: { _year: number }; Returns: Json }
      my_roles: { Args: never; Returns: string[] }
      process_due_payout_batches: { Args: never; Returns: number }
      register_device: {
        Args: {
          _fingerprint: string
          _platform?: string
          _timezone?: string
          _user_agent?: string
        }
        Returns: Json
      }
      request_redemption: { Args: { _reward_id: string }; Returns: string }
      request_withdrawal: {
        Args: { _coins: number; _destination: string; _method: string }
        Returns: string
      }
      start_external_survey: {
        Args: { _answers: Json; _survey_id: string }
        Returns: Json
      }
      submit_kyc: {
        Args: {
          _country: string
          _dob: string
          _doc_reference: string
          _doc_type: string
          _full_name: string
        }
        Returns: undefined
      }
      user_balance: { Args: { _user_id: string }; Returns: number }
      vote_daily_poll: {
        Args: { _option_index: number; _poll_id: string }
        Returns: number
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "user"
        | "moderator"
        | "support"
        | "finance"
        | "reviewer"
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
      app_role: [
        "admin",
        "user",
        "moderator",
        "support",
        "finance",
        "reviewer",
      ],
    },
  },
} as const
