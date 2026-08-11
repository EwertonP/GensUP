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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          body: string | null
          client_id: string | null
          created_at: string
          created_by: string | null
          id: string
          prospect_id: string | null
          type: string
        }
        Insert: {
          body?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          prospect_id?: string | null
          type: string
        }
        Update: {
          body?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          prospect_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_runs: {
        Row: {
          agent_task_id: string
          confidence: number | null
          created_at: string
          id: string
          outcome: string | null
          reasoning: string | null
        }
        Insert: {
          agent_task_id: string
          confidence?: number | null
          created_at?: string
          id?: string
          outcome?: string | null
          reasoning?: string | null
        }
        Update: {
          agent_task_id?: string
          confidence?: number | null
          created_at?: string
          id?: string
          outcome?: string | null
          reasoning?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_runs_agent_task_id_fkey"
            columns: ["agent_task_id"]
            isOneToOne: false
            referencedRelation: "agent_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_tasks: {
        Row: {
          client_id: string | null
          created_at: string
          id: string
          payload: Json
          status: string
          type: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          id?: string
          payload?: Json
          status?: string
          type: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          id?: string
          payload?: Json
          status?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      carousel_feedback: {
        Row: {
          comment: string
          content_item_id: string
          created_at: string
          created_by: string | null
          id: string
          is_cta: boolean
          page_number: number
          status: string
        }
        Insert: {
          comment: string
          content_item_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_cta?: boolean
          page_number: number
          status?: string
        }
        Update: {
          comment?: string
          content_item_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_cta?: boolean
          page_number?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "carousel_feedback_content_item_id_fkey"
            columns: ["content_item_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "carousel_feedback_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string | null
          status?: string
        }
        Relationships: []
      }
      content_items: {
        Row: {
          caption: string | null
          client_id: string
          created_at: string
          created_by: string | null
          id: string
          media_url: string | null
          published_at: string | null
          scheduled_at: string | null
          status: string
          suggested_caption: string | null
          title: string | null
          type: string
        }
        Insert: {
          caption?: string | null
          client_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          media_url?: string | null
          published_at?: string | null
          scheduled_at?: string | null
          status?: string
          suggested_caption?: string | null
          title?: string | null
          type: string
        }
        Update: {
          caption?: string | null
          client_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          media_url?: string | null
          published_at?: string | null
          scheduled_at?: string | null
          status?: string
          suggested_caption?: string | null
          title?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_items_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      content_pages: {
        Row: {
          content_item_id: string
          created_at: string
          id: string
          is_cta: boolean
          media_url: string
          page_number: number
        }
        Insert: {
          content_item_id: string
          created_at?: string
          id?: string
          is_cta?: boolean
          media_url: string
          page_number: number
        }
        Update: {
          content_item_id?: string
          created_at?: string
          id?: string
          is_cta?: boolean
          media_url?: string
          page_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "content_pages_content_item_id_fkey"
            columns: ["content_item_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          content_item_id: string
          id: string
          new_status: string
          old_status: string | null
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          content_item_id: string
          id?: string
          new_status: string
          old_status?: string | null
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          content_item_id?: string
          id?: string
          new_status?: string
          old_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_history_content_item_id_fkey"
            columns: ["content_item_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
        ]
      }
      insights_snapshots: {
        Row: {
          created_at: string
          id: string
          metric: string
          snapshot_date: string
          social_account_id: string
          value: number
        }
        Insert: {
          created_at?: string
          id?: string
          metric: string
          snapshot_date: string
          social_account_id: string
          value: number
        }
        Update: {
          created_at?: string
          id?: string
          metric?: string
          snapshot_date?: string
          social_account_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "insights_snapshots_social_account_id_fkey"
            columns: ["social_account_id"]
            isOneToOne: false
            referencedRelation: "social_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      link_clicks: {
        Row: {
          clicked_at: string
          country: string | null
          id: string
          referrer: string | null
          user_agent: string | null
          utm_link_id: string
        }
        Insert: {
          clicked_at?: string
          country?: string | null
          id?: string
          referrer?: string | null
          user_agent?: string | null
          utm_link_id: string
        }
        Update: {
          clicked_at?: string
          country?: string | null
          id?: string
          referrer?: string | null
          user_agent?: string | null
          utm_link_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "link_clicks_utm_link_id_fkey"
            columns: ["utm_link_id"]
            isOneToOne: false
            referencedRelation: "utm_links"
            referencedColumns: ["id"]
          },
        ]
      }
      prospects: {
        Row: {
          company: string | null
          converted_client_id: string | null
          created_at: string
          id: string
          name: string
          owner_user_id: string | null
          source: string | null
          stage: string
        }
        Insert: {
          company?: string | null
          converted_client_id?: string | null
          created_at?: string
          id?: string
          name: string
          owner_user_id?: string | null
          source?: string | null
          stage?: string
        }
        Update: {
          company?: string | null
          converted_client_id?: string | null
          created_at?: string
          id?: string
          name?: string
          owner_user_id?: string | null
          source?: string | null
          stage?: string
        }
        Relationships: [
          {
            foreignKeyName: "prospects_converted_client_id_fkey"
            columns: ["converted_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospects_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      social_accounts: {
        Row: {
          access_token: string | null
          client_id: string
          created_at: string
          id: string
          last_sync: string | null
          platform: string
          platform_account_id: string | null
        }
        Insert: {
          access_token?: string | null
          client_id: string
          created_at?: string
          id?: string
          last_sync?: string | null
          platform: string
          platform_account_id?: string | null
        }
        Update: {
          access_token?: string | null
          client_id?: string
          created_at?: string
          id?: string
          last_sync?: string | null
          platform?: string
          platform_account_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_accounts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          client_id: string | null
          created_at: string
          email: string
          id: string
          role: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          email: string
          id: string
          role: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          email?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      utm_links: {
        Row: {
          client_id: string
          created_at: string
          created_by: string | null
          destination_url: string
          id: string
          is_active: boolean
          slug: string
          title: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by?: string | null
          destination_url: string
          id?: string
          is_active?: boolean
          slug: string
          title: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string | null
          destination_url?: string
          id?: string
          is_active?: boolean
          slug?: string
          title?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "utm_links_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "utm_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      video_feedback: {
        Row: {
          comment: string
          content_item_id: string
          created_at: string
          created_by: string | null
          id: string
          status: string
          timestamp_seconds: number
        }
        Insert: {
          comment: string
          content_item_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          status?: string
          timestamp_seconds: number
        }
        Update: {
          comment?: string
          content_item_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          status?: string
          timestamp_seconds?: number
        }
        Relationships: [
          {
            foreignKeyName: "video_feedback_content_item_id_fkey"
            columns: ["content_item_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_feedback_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auth_client_id: { Args: never; Returns: string }
      auth_role: { Args: never; Returns: string }
      claim_next_agent_task: {
        Args: never
        Returns: {
          client_id: string | null
          created_at: string
          id: string
          payload: Json
          status: string
          type: string
        }[]
        SetofOptions: {
          from: "*"
          to: "agent_tasks"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      is_admin: { Args: never; Returns: boolean }
      storage_object_client_id: {
        Args: { object_name: string }
        Returns: string
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
