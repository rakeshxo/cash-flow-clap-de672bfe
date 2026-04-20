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
          avatar_url: string | null
          created_at: string
          daily_streak: number
          display_name: string | null
          id: string
          last_active_date: string | null
          referral_code: string | null
          referred_by: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          daily_streak?: number
          display_name?: string | null
          id?: string
          last_active_date?: string | null
          referral_code?: string | null
          referred_by?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          daily_streak?: number
          display_name?: string | null
          id?: string
          last_active_date?: string | null
          referral_code?: string | null
          referred_by?: string | null
          user_id?: string
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
          title?: string
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
          cash_value_cents: number
          coins_amount: number
          created_at: string
          destination: string
          id: string
          method: string
          processed_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          cash_value_cents: number
          coins_amount: number
          created_at?: string
          destination: string
          id?: string
          method: string
          processed_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          cash_value_cents?: number
          coins_amount?: number
          created_at?: string
          destination?: string
          id?: string
          method?: string
          processed_at?: string | null
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
