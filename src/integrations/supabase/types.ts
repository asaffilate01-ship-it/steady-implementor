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
      api_keys: {
        Row: {
          created_at: string
          id: string
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          owner_user_id: string | null
          provider_id: string | null
          revoked_at: string | null
          scopes: string[]
        }
        Insert: {
          created_at?: string
          id?: string
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          owner_user_id?: string | null
          provider_id?: string | null
          revoked_at?: string | null
          scopes?: string[]
        }
        Update: {
          created_at?: string
          id?: string
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          owner_user_id?: string | null
          provider_id?: string | null
          revoked_at?: string | null
          scopes?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      api_rate_limit_buckets: {
        Row: {
          api_key_id: string
          bucket_start: string
          request_count: number
        }
        Insert: {
          api_key_id: string
          bucket_start: string
          request_count?: number
        }
        Update: {
          api_key_id?: string
          bucket_start?: string
          request_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "api_rate_limit_buckets_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      api_request_log: {
        Row: {
          api_key_id: string | null
          created_at: string
          id: string
          latency_ms: number
          path: string
          status: number
        }
        Insert: {
          api_key_id?: string | null
          created_at?: string
          id?: string
          latency_ms?: number
          path: string
          status: number
        }
        Update: {
          api_key_id?: string | null
          created_at?: string
          id?: string
          latency_ms?: number
          path?: string
          status?: number
        }
        Relationships: [
          {
            foreignKeyName: "api_request_log_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_events: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json
          org_id: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json
          org_id?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json
          org_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      notice_appeals: {
        Row: {
          created_at: string
          details: string
          driver_id: string
          id: string
          notice_id: string
          reason: string
          resolved_at: string | null
          response: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          details: string
          driver_id: string
          id?: string
          notice_id: string
          reason: string
          resolved_at?: string | null
          response?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          details?: string
          driver_id?: string
          id?: string
          notice_id?: string
          reason?: string
          resolved_at?: string | null
          response?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notice_appeals_notice_id_fkey"
            columns: ["notice_id"]
            isOneToOne: true
            referencedRelation: "notices"
            referencedColumns: ["id"]
          },
        ]
      }
      notices: {
        Row: {
          amount_cents: number
          appeal_deadline: string | null
          created_at: string
          driver_id: string | null
          evidence: Json
          id: string
          issued_by: string | null
          paid_at: string | null
          plate: string
          reason: string
          site_id: string
          status: string
          updated_at: string
        }
        Insert: {
          amount_cents?: number
          appeal_deadline?: string | null
          created_at?: string
          driver_id?: string | null
          evidence?: Json
          id?: string
          issued_by?: string | null
          paid_at?: string | null
          plate: string
          reason: string
          site_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          appeal_deadline?: string | null
          created_at?: string
          driver_id?: string | null
          evidence?: Json
          id?: string
          issued_by?: string | null
          paid_at?: string | null
          plate?: string
          reason?: string
          site_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notices_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_deliveries: {
        Row: {
          attempts: number
          created_at: string
          id: string
          last_attempt_at: string | null
          last_error: string | null
          next_attempt_at: string
          notification_id: string
          provider_ref: string | null
          sent_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          id?: string
          last_attempt_at?: string | null
          last_error?: string | null
          next_attempt_at?: string
          notification_id: string
          provider_ref?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          id?: string
          last_attempt_at?: string | null
          last_error?: string | null
          next_attempt_at?: string
          notification_id?: string
          provider_ref?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_deliveries_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: true
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          body: string
          created_at: string
          id: string
          metadata: Json
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          body: string
          created_at?: string
          id?: string
          metadata?: Json
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          body?: string
          created_at?: string
          id?: string
          metadata?: Json
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      orgs: {
        Row: {
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["org_kind"]
          name: string
          platform_fee_bps: number
          platform_fixed_fee_cents: number
        }
        Insert: {
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["org_kind"]
          name: string
          platform_fee_bps?: number
          platform_fixed_fee_cents?: number
        }
        Update: {
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["org_kind"]
          name?: string
          platform_fee_bps?: number
          platform_fixed_fee_cents?: number
        }
        Relationships: []
      }
      payment_webhook_events: {
        Row: {
          error_message: string | null
          event_id: string
          event_type: string
          id: string
          payload: Json
          processed_at: string | null
          provider: string
          received_at: string
          status: string
        }
        Insert: {
          error_message?: string | null
          event_id: string
          event_type: string
          id?: string
          payload: Json
          processed_at?: string | null
          provider: string
          received_at?: string
          status?: string
        }
        Update: {
          error_message?: string | null
          event_id?: string
          event_type?: string
          id?: string
          payload?: Json
          processed_at?: string | null
          provider?: string
          received_at?: string
          status?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          description: string | null
          driver_id: string
          external_ref: string | null
          failure_code: string | null
          failure_message: string | null
          id: string
          metadata: Json
          method: string
          notice_id: string | null
          operator_net_cents: number
          paid_at: string | null
          payout_status: string
          platform_fee_cents: number
          provider: string | null
          provider_charge_id: string | null
          provider_payment_id: string | null
          refunded_cents: number
          reservation_id: string | null
          session_id: string | null
          site_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          currency?: string
          description?: string | null
          driver_id: string
          external_ref?: string | null
          failure_code?: string | null
          failure_message?: string | null
          id?: string
          metadata?: Json
          method?: string
          notice_id?: string | null
          operator_net_cents?: number
          paid_at?: string | null
          payout_status?: string
          platform_fee_cents?: number
          provider?: string | null
          provider_charge_id?: string | null
          provider_payment_id?: string | null
          refunded_cents?: number
          reservation_id?: string | null
          session_id?: string | null
          site_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          description?: string | null
          driver_id?: string
          external_ref?: string | null
          failure_code?: string | null
          failure_message?: string | null
          id?: string
          metadata?: Json
          method?: string
          notice_id?: string | null
          operator_net_cents?: number
          paid_at?: string | null
          payout_status?: string
          platform_fee_cents?: number
          provider?: string | null
          provider_charge_id?: string | null
          provider_payment_id?: string | null
          refunded_cents?: number
          reservation_id?: string | null
          session_id?: string | null
          site_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_notice_id_fkey"
            columns: ["notice_id"]
            isOneToOne: false
            referencedRelation: "notices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      payouts: {
        Row: {
          created_at: string
          id: string
          org_id: string | null
          paid_at: string | null
          payout_ref: string | null
          period_end: string
          period_start: string
          provider_id: string | null
          status: string
          total_gross_cents: number
          total_net_cents: number
          total_platform_fee_cents: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          org_id?: string | null
          paid_at?: string | null
          payout_ref?: string | null
          period_end: string
          period_start: string
          provider_id?: string | null
          status?: string
          total_gross_cents?: number
          total_net_cents?: number
          total_platform_fee_cents?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          org_id?: string | null
          paid_at?: string | null
          payout_ref?: string | null
          period_end?: string
          period_start?: string
          provider_id?: string | null
          status?: string
          total_gross_cents?: number
          total_net_cents?: number
          total_platform_fee_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payouts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payouts_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          org_id: string | null
          payment_method: string | null
          phone: string | null
          plate: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          org_id?: string | null
          payment_method?: string | null
          phone?: string | null
          plate?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          org_id?: string | null
          payment_method?: string | null
          phone?: string | null
          plate?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_credentials: {
        Row: {
          created_at: string
          credential_ref: string
          id: string
          provider_id: string
        }
        Insert: {
          created_at?: string
          credential_ref: string
          id?: string
          provider_id: string
        }
        Update: {
          created_at?: string
          credential_ref?: string
          id?: string
          provider_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_credentials_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      providers: {
        Row: {
          api_base_url: string | null
          auth_type: Database["public"]["Enums"]["provider_auth"]
          contact_email: string | null
          country: string
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["provider_kind"]
          last_sync_completed_at: string | null
          last_sync_created: number
          last_sync_error: string | null
          last_sync_started_at: string | null
          last_sync_status: string
          last_sync_updated: number
          name: string
          notes: string | null
          platform_fee_bps: number
          platform_fixed_fee_cents: number
          slug: string
          status: Database["public"]["Enums"]["provider_status"]
          updated_at: string
        }
        Insert: {
          api_base_url?: string | null
          auth_type?: Database["public"]["Enums"]["provider_auth"]
          contact_email?: string | null
          country?: string
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["provider_kind"]
          last_sync_completed_at?: string | null
          last_sync_created?: number
          last_sync_error?: string | null
          last_sync_started_at?: string | null
          last_sync_status?: string
          last_sync_updated?: number
          name: string
          notes?: string | null
          platform_fee_bps?: number
          platform_fixed_fee_cents?: number
          slug: string
          status?: Database["public"]["Enums"]["provider_status"]
          updated_at?: string
        }
        Update: {
          api_base_url?: string | null
          auth_type?: Database["public"]["Enums"]["provider_auth"]
          contact_email?: string | null
          country?: string
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["provider_kind"]
          last_sync_completed_at?: string | null
          last_sync_created?: number
          last_sync_error?: string | null
          last_sync_started_at?: string | null
          last_sync_status?: string
          last_sync_updated?: number
          name?: string
          notes?: string | null
          platform_fee_bps?: number
          platform_fixed_fee_cents?: number
          slug?: string
          status?: Database["public"]["Enums"]["provider_status"]
          updated_at?: string
        }
        Relationships: []
      }
      reservations: {
        Row: {
          created_at: string
          currency: string
          driver_id: string
          ends_at: string
          id: string
          plate: string
          price_cents: number
          site_id: string
          starts_at: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          driver_id: string
          ends_at: string
          id?: string
          plate: string
          price_cents?: number
          site_id: string
          starts_at: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          driver_id?: string
          ends_at?: string
          id?: string
          plate?: string
          price_cents?: number
          site_id?: string
          starts_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservations_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          amount_cents: number
          created_at: string
          ends_at: string
          id: string
          payment_method: string | null
          plate: string
          price_cents_per_hour: number
          site_id: string
          started_at: string
          status: Database["public"]["Enums"]["session_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_cents?: number
          created_at?: string
          ends_at: string
          id?: string
          payment_method?: string | null
          plate: string
          price_cents_per_hour: number
          site_id: string
          started_at?: string
          status?: Database["public"]["Enums"]["session_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          ends_at?: string
          id?: string
          payment_method?: string | null
          plate?: string
          price_cents_per_hour?: number
          site_id?: string
          started_at?: string
          status?: Database["public"]["Enums"]["session_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      settlement_items: {
        Row: {
          created_at: string
          gross_cents: number
          id: string
          net_cents: number
          payment_id: string
          payout_id: string
          platform_fee_cents: number
        }
        Insert: {
          created_at?: string
          gross_cents: number
          id?: string
          net_cents: number
          payment_id: string
          payout_id: string
          platform_fee_cents: number
        }
        Update: {
          created_at?: string
          gross_cents?: number
          id?: string
          net_cents?: number
          payment_id?: string
          payout_id?: string
          platform_fee_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "settlement_items_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: true
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlement_items_payout_id_fkey"
            columns: ["payout_id"]
            isOneToOne: false
            referencedRelation: "payouts"
            referencedColumns: ["id"]
          },
        ]
      }
      site_provider_mapping: {
        Row: {
          created_at: string
          external_site_id: string
          id: string
          last_synced_at: string | null
          provider_id: string
          site_id: string
        }
        Insert: {
          created_at?: string
          external_site_id: string
          id?: string
          last_synced_at?: string | null
          provider_id: string
          site_id: string
        }
        Update: {
          created_at?: string
          external_site_id?: string
          id?: string
          last_synced_at?: string | null
          provider_id?: string
          site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_provider_mapping_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_provider_mapping_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: true
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      sites: {
        Row: {
          address: string
          amenities: string[]
          capacity: number
          created_at: string
          id: string
          lat: number
          lng: number
          name: string
          occupied: number
          operator_name: string | null
          org_id: string | null
          platform_fee_bps: number | null
          platform_fixed_fee_cents: number | null
          price_cents_per_hour: number
          type: Database["public"]["Enums"]["site_type"]
          updated_at: string
        }
        Insert: {
          address: string
          amenities?: string[]
          capacity: number
          created_at?: string
          id?: string
          lat: number
          lng: number
          name: string
          occupied?: number
          operator_name?: string | null
          org_id?: string | null
          platform_fee_bps?: number | null
          platform_fixed_fee_cents?: number | null
          price_cents_per_hour: number
          type?: Database["public"]["Enums"]["site_type"]
          updated_at?: string
        }
        Update: {
          address?: string
          amenities?: string[]
          capacity?: number
          created_at?: string
          id?: string
          lat?: number
          lng?: number
          name?: string
          occupied?: number
          operator_name?: string | null
          org_id?: string | null
          platform_fee_bps?: number | null
          platform_fixed_fee_cents?: number | null
          price_cents_per_hour?: number
          type?: Database["public"]["Enums"]["site_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sites_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          org_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          org_id?: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          org_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_platform_fee: {
        Args: {
          _amount_cents: number
          _org_id: string
          _provider_id: string
          _site_id: string
        }
        Returns: {
          operator_net_cents: number
          platform_fee_cents: number
        }[]
      }
      cancel_parking_reservation: {
        Args: { _reservation_id: string }
        Returns: {
          created_at: string
          currency: string
          driver_id: string
          ends_at: string
          id: string
          plate: string
          price_cents: number
          site_id: string
          starts_at: string
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "reservations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      check_parking_session: {
        Args: { _plate: string; _site_id: string }
        Returns: Json
      }
      claim_notification_deliveries: {
        Args: { _limit?: number }
        Returns: {
          attempts: number
          created_at: string
          id: string
          last_attempt_at: string | null
          last_error: string | null
          next_attempt_at: string
          notification_id: string
          provider_ref: string | null
          sent_at: string | null
          status: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "notification_deliveries"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      consume_api_rate_limit: {
        Args: {
          _api_key_id: string
          _request_limit: number
          _window_seconds?: number
        }
        Returns: boolean
      }
      create_notice_appeal: {
        Args: { _details: string; _notice_id: string; _reason: string }
        Returns: {
          created_at: string
          details: string
          driver_id: string
          id: string
          notice_id: string
          reason: string
          resolved_at: string | null
          response: string | null
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "notice_appeals"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_notice_payment: {
        Args: { _notice_id: string }
        Returns: {
          amount_cents: number
          created_at: string
          currency: string
          description: string | null
          driver_id: string
          external_ref: string | null
          failure_code: string | null
          failure_message: string | null
          id: string
          metadata: Json
          method: string
          notice_id: string | null
          operator_net_cents: number
          paid_at: string | null
          payout_status: string
          platform_fee_cents: number
          provider: string | null
          provider_charge_id: string | null
          provider_payment_id: string | null
          refunded_cents: number
          reservation_id: string | null
          session_id: string | null
          site_id: string | null
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "payments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_operator_site: {
        Args: {
          _address: string
          _amenities?: string[]
          _capacity: number
          _lat: number
          _lng: number
          _name: string
          _operator_name: string
          _price_cents_per_hour: number
          _type?: Database["public"]["Enums"]["site_type"]
        }
        Returns: {
          address: string
          amenities: string[]
          capacity: number
          created_at: string
          id: string
          lat: number
          lng: number
          name: string
          occupied: number
          operator_name: string | null
          org_id: string | null
          platform_fee_bps: number | null
          platform_fixed_fee_cents: number | null
          price_cents_per_hour: number
          type: Database["public"]["Enums"]["site_type"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "sites"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_parking_reservation: {
        Args: {
          _minutes: number
          _plate: string
          _site_id: string
          _starts_at: string
        }
        Returns: {
          created_at: string
          currency: string
          driver_id: string
          ends_at: string
          id: string
          plate: string
          price_cents: number
          site_id: string
          starts_at: string
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "reservations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_settlement_batch: {
        Args: { _period_end: string; _period_start: string }
        Returns: {
          created_at: string
          id: string
          org_id: string | null
          paid_at: string | null
          payout_ref: string | null
          period_end: string
          period_start: string
          provider_id: string | null
          status: string
          total_gross_cents: number
          total_net_cents: number
          total_platform_fee_cents: number
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "payouts"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      end_parking_session: { Args: { _session_id: string }; Returns: Json }
      extend_parking_session: {
        Args: { _minutes: number; _session_id: string }
        Returns: {
          amount_cents: number
          created_at: string
          ends_at: string
          id: string
          payment_method: string | null
          plate: string
          price_cents_per_hour: number
          site_id: string
          started_at: string
          status: Database["public"]["Enums"]["session_status"]
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_operator_sites: {
        Args: never
        Returns: {
          address: string
          amenities: string[]
          capacity: number
          created_at: string
          id: string
          lat: number
          lng: number
          name: string
          occupied: number
          operator_name: string | null
          org_id: string | null
          platform_fee_bps: number | null
          platform_fixed_fee_cents: number | null
          price_cents_per_hour: number
          type: Database["public"]["Enums"]["site_type"]
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "sites"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_operator_org_member: { Args: { _org_id: string }; Returns: boolean }
      is_org_member: { Args: { _org_id: string }; Returns: boolean }
      issue_parking_notice: {
        Args: {
          _amount_cents: number
          _plate: string
          _reason: string
          _site_id: string
        }
        Returns: {
          amount_cents: number
          appeal_deadline: string | null
          created_at: string
          driver_id: string | null
          evidence: Json
          id: string
          issued_by: string | null
          paid_at: string | null
          plate: string
          reason: string
          site_id: string
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "notices"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      issue_parking_notice_v2: {
        Args: {
          _amount_cents: number
          _evidence?: Json
          _plate: string
          _reason: string
          _site_id: string
        }
        Returns: {
          amount_cents: number
          appeal_deadline: string | null
          created_at: string
          driver_id: string | null
          evidence: Json
          id: string
          issued_by: string | null
          paid_at: string | null
          plate: string
          reason: string
          site_id: string
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "notices"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      mark_notification_read: {
        Args: { _notification_id: string }
        Returns: {
          action_url: string | null
          body: string
          created_at: string
          id: string
          metadata: Json
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "notifications"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      mark_payout_paid: {
        Args: { _payout_id: string; _payout_ref: string }
        Returns: {
          created_at: string
          id: string
          org_id: string | null
          paid_at: string | null
          payout_ref: string | null
          period_end: string
          period_start: string
          provider_id: string | null
          status: string
          total_gross_cents: number
          total_net_cents: number
          total_platform_fee_cents: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "payouts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      resolve_notice_appeal: {
        Args: { _appeal_id: string; _decision: string; _response: string }
        Returns: {
          created_at: string
          details: string
          driver_id: string
          id: string
          notice_id: string
          reason: string
          resolved_at: string | null
          response: string | null
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "notice_appeals"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      session_amount_cents: { Args: { _session_id: string }; Returns: number }
      start_parking_session: {
        Args: {
          _minutes: number
          _payment_method?: string
          _plate: string
          _site_id: string
        }
        Returns: {
          amount_cents: number
          created_at: string
          ends_at: string
          id: string
          payment_method: string | null
          plate: string
          price_cents_per_hour: number
          site_id: string
          started_at: string
          status: Database["public"]["Enums"]["session_status"]
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_operator_site: {
        Args: {
          _occupied?: number
          _price_cents_per_hour?: number
          _site_id: string
        }
        Returns: {
          address: string
          amenities: string[]
          capacity: number
          created_at: string
          id: string
          lat: number
          lng: number
          name: string
          occupied: number
          operator_name: string | null
          org_id: string | null
          platform_fee_bps: number | null
          platform_fixed_fee_cents: number | null
          price_cents_per_hour: number
          type: Database["public"]["Enums"]["site_type"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "sites"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_parking_notice_status: {
        Args: { _notice_id: string; _status: string }
        Returns: {
          amount_cents: number
          appeal_deadline: string | null
          created_at: string
          driver_id: string | null
          evidence: Json
          id: string
          issued_by: string | null
          paid_at: string | null
          plate: string
          reason: string
          site_id: string
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "notices"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      app_role: "admin" | "operator" | "provider" | "enforcement"
      org_kind: "operator" | "provider"
      provider_auth: "none" | "api_key" | "oauth2" | "basic"
      provider_kind:
        | "operator"
        | "municipal"
        | "datex"
        | "handyparken"
        | "other"
      provider_status: "active" | "paused" | "onboarding"
      session_status: "active" | "ended" | "cancelled"
      site_type: "street" | "garage" | "lot"
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
      app_role: ["admin", "operator", "provider", "enforcement"],
      org_kind: ["operator", "provider"],
      provider_auth: ["none", "api_key", "oauth2", "basic"],
      provider_kind: ["operator", "municipal", "datex", "handyparken", "other"],
      provider_status: ["active", "paused", "onboarding"],
      session_status: ["active", "ended", "cancelled"],
      site_type: ["street", "garage", "lot"],
    },
  },
} as const
