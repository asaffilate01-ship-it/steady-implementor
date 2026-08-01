export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      api_keys: {
        Row: {
          created_at: string;
          id: string;
          key_hash: string;
          key_prefix: string;
          last_used_at: string | null;
          name: string;
          owner_user_id: string | null;
          provider_id: string | null;
          revoked_at: string | null;
          scopes: string[];
        };
        Insert: {
          created_at?: string;
          id?: string;
          key_hash: string;
          key_prefix: string;
          last_used_at?: string | null;
          name: string;
          owner_user_id?: string | null;
          provider_id?: string | null;
          revoked_at?: string | null;
          scopes?: string[];
        };
        Update: {
          created_at?: string;
          id?: string;
          key_hash?: string;
          key_prefix?: string;
          last_used_at?: string | null;
          name?: string;
          owner_user_id?: string | null;
          provider_id?: string | null;
          revoked_at?: string | null;
          scopes?: string[];
        };
        Relationships: [
          {
            foreignKeyName: "api_keys_provider_id_fkey";
            columns: ["provider_id"];
            isOneToOne: false;
            referencedRelation: "providers";
            referencedColumns: ["id"];
          },
        ];
      };
      api_request_log: {
        Row: {
          api_key_id: string | null;
          created_at: string;
          id: string;
          latency_ms: number;
          path: string;
          status: number;
        };
        Insert: {
          api_key_id?: string | null;
          created_at?: string;
          id?: string;
          latency_ms?: number;
          path: string;
          status: number;
        };
        Update: {
          api_key_id?: string | null;
          created_at?: string;
          id?: string;
          latency_ms?: number;
          path?: string;
          status?: number;
        };
        Relationships: [
          {
            foreignKeyName: "api_request_log_api_key_id_fkey";
            columns: ["api_key_id"];
            isOneToOne: false;
            referencedRelation: "api_keys";
            referencedColumns: ["id"];
          },
        ];
      };
      api_rate_limit_buckets: {
        Row: {
          api_key_id: string;
          bucket_start: string;
          request_count: number;
        };
        Insert: {
          api_key_id: string;
          bucket_start: string;
          request_count?: number;
        };
        Update: {
          api_key_id?: string;
          bucket_start?: string;
          request_count?: number;
        };
        Relationships: [
          {
            foreignKeyName: "api_rate_limit_buckets_api_key_id_fkey";
            columns: ["api_key_id"];
            isOneToOne: false;
            referencedRelation: "api_keys";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_events: {
        Row: {
          action: string;
          actor_user_id: string | null;
          created_at: string;
          entity_id: string | null;
          entity_type: string;
          id: string;
          metadata: Json;
          org_id: string | null;
        };
        Insert: {
          action: string;
          actor_user_id?: string | null;
          created_at?: string;
          entity_id?: string | null;
          entity_type: string;
          id?: string;
          metadata?: Json;
          org_id?: string | null;
        };
        Update: {
          action?: string;
          actor_user_id?: string | null;
          created_at?: string;
          entity_id?: string | null;
          entity_type?: string;
          id?: string;
          metadata?: Json;
          org_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "audit_events_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "orgs";
            referencedColumns: ["id"];
          },
        ];
      };
      business_accounts: {
        Row: {
          allowed_from: string | null;
          allowed_until: string | null;
          billing_email: string | null;
          created_at: string;
          id: string;
          monthly_budget_cents: number | null;
          name: string;
          owner_user_id: string;
          status: string;
          updated_at: string;
          vat_id: string | null;
        };
        Insert: {
          allowed_from?: string | null;
          allowed_until?: string | null;
          billing_email?: string | null;
          created_at?: string;
          id?: string;
          monthly_budget_cents?: number | null;
          name: string;
          owner_user_id: string;
          status?: string;
          updated_at?: string;
          vat_id?: string | null;
        };
        Update: {
          allowed_from?: string | null;
          allowed_until?: string | null;
          billing_email?: string | null;
          created_at?: string;
          id?: string;
          monthly_budget_cents?: number | null;
          name?: string;
          owner_user_id?: string;
          status?: string;
          updated_at?: string;
          vat_id?: string | null;
        };
        Relationships: [];
      };
      business_members: {
        Row: {
          business_id: string;
          created_at: string;
          member_role: string;
          spending_limit_cents: number | null;
          user_id: string;
        };
        Insert: {
          business_id: string;
          created_at?: string;
          member_role?: string;
          spending_limit_cents?: number | null;
          user_id: string;
        };
        Update: {
          business_id?: string;
          created_at?: string;
          member_role?: string;
          spending_limit_cents?: number | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "business_members_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "business_accounts";
            referencedColumns: ["id"];
          },
        ];
      };
      business_vehicles: {
        Row: {
          business_id: string;
          cost_centre_id: string | null;
          created_at: string;
          monthly_limit_cents: number | null;
          vehicle_id: string;
        };
        Insert: {
          business_id: string;
          cost_centre_id?: string | null;
          created_at?: string;
          monthly_limit_cents?: number | null;
          vehicle_id: string;
        };
        Update: {
          business_id?: string;
          cost_centre_id?: string | null;
          created_at?: string;
          monthly_limit_cents?: number | null;
          vehicle_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "business_vehicles_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "business_accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "business_vehicles_cost_centre_id_fkey";
            columns: ["cost_centre_id"];
            isOneToOne: false;
            referencedRelation: "cost_centres";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "business_vehicles_vehicle_id_fkey";
            columns: ["vehicle_id"];
            isOneToOne: false;
            referencedRelation: "vehicles";
            referencedColumns: ["id"];
          },
        ];
      };
      cost_centres: {
        Row: {
          business_id: string;
          code: string;
          created_at: string;
          id: string;
          is_active: boolean;
          name: string;
        };
        Insert: {
          business_id: string;
          code: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name: string;
        };
        Update: {
          business_id?: string;
          code?: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cost_centres_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "business_accounts";
            referencedColumns: ["id"];
          },
        ];
      };
      driver_preferences: {
        Row: {
          accessibility: Json;
          active_profile: string;
          created_at: string;
          default_payment_method: string;
          locale: string;
          notifications: Json;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          accessibility?: Json;
          active_profile?: string;
          created_at?: string;
          default_payment_method?: string;
          locale?: string;
          notifications?: Json;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          accessibility?: Json;
          active_profile?: string;
          created_at?: string;
          default_payment_method?: string;
          locale?: string;
          notifications?: Json;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      favourite_sites: {
        Row: { created_at: string; site_id: string; user_id: string };
        Insert: { created_at?: string; site_id: string; user_id: string };
        Update: { created_at?: string; site_id?: string; user_id?: string };
        Relationships: [
          {
            foreignKeyName: "favourite_sites_site_id_fkey";
            columns: ["site_id"];
            isOneToOne: false;
            referencedRelation: "sites";
            referencedColumns: ["id"];
          },
        ];
      };
      notice_appeals: {
        Row: {
          created_at: string;
          details: string;
          driver_id: string;
          id: string;
          notice_id: string;
          reason: string;
          resolved_at: string | null;
          response: string | null;
          status: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          details: string;
          driver_id: string;
          id?: string;
          notice_id: string;
          reason: string;
          resolved_at?: string | null;
          response?: string | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          details?: string;
          driver_id?: string;
          id?: string;
          notice_id?: string;
          reason?: string;
          resolved_at?: string | null;
          response?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notice_appeals_notice_id_fkey";
            columns: ["notice_id"];
            isOneToOne: true;
            referencedRelation: "notices";
            referencedColumns: ["id"];
          },
        ];
      };
      notices: {
        Row: {
          amount_cents: number;
          appeal_deadline: string | null;
          created_at: string;
          driver_id: string | null;
          evidence: Json;
          id: string;
          issued_by: string | null;
          paid_at: string | null;
          plate: string;
          reason: string;
          site_id: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          amount_cents?: number;
          appeal_deadline?: string | null;
          created_at?: string;
          driver_id?: string | null;
          evidence?: Json;
          id?: string;
          issued_by?: string | null;
          paid_at?: string | null;
          plate: string;
          reason: string;
          site_id: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          amount_cents?: number;
          appeal_deadline?: string | null;
          created_at?: string;
          driver_id?: string | null;
          evidence?: Json;
          id?: string;
          issued_by?: string | null;
          paid_at?: string | null;
          plate?: string;
          reason?: string;
          site_id?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notices_site_id_fkey";
            columns: ["site_id"];
            isOneToOne: false;
            referencedRelation: "sites";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          action_url: string | null;
          body: string;
          created_at: string;
          id: string;
          metadata: Json;
          read_at: string | null;
          title: string;
          type: string;
          user_id: string;
        };
        Insert: {
          action_url?: string | null;
          body: string;
          created_at?: string;
          id?: string;
          metadata?: Json;
          read_at?: string | null;
          title: string;
          type: string;
          user_id: string;
        };
        Update: {
          action_url?: string | null;
          body?: string;
          created_at?: string;
          id?: string;
          metadata?: Json;
          read_at?: string | null;
          title?: string;
          type?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      notification_deliveries: {
        Row: {
          attempts: number;
          created_at: string;
          id: string;
          last_attempt_at: string | null;
          last_error: string | null;
          next_attempt_at: string;
          notification_id: string;
          provider_ref: string | null;
          sent_at: string | null;
          status: string;
          updated_at: string;
        };
        Insert: {
          attempts?: number;
          created_at?: string;
          id?: string;
          last_attempt_at?: string | null;
          last_error?: string | null;
          next_attempt_at?: string;
          notification_id: string;
          provider_ref?: string | null;
          sent_at?: string | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          attempts?: number;
          created_at?: string;
          id?: string;
          last_attempt_at?: string | null;
          last_error?: string | null;
          next_attempt_at?: string;
          notification_id?: string;
          provider_ref?: string | null;
          sent_at?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notification_deliveries_notification_id_fkey";
            columns: ["notification_id"];
            isOneToOne: true;
            referencedRelation: "notifications";
            referencedColumns: ["id"];
          },
        ];
      };
      orgs: {
        Row: {
          created_at: string;
          id: string;
          kind: Database["public"]["Enums"]["org_kind"];
          name: string;
          platform_fee_bps: number;
          platform_fixed_fee_cents: number;
        };
        Insert: {
          created_at?: string;
          id?: string;
          kind: Database["public"]["Enums"]["org_kind"];
          name: string;
          platform_fee_bps?: number;
          platform_fixed_fee_cents?: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          kind?: Database["public"]["Enums"]["org_kind"];
          name?: string;
          platform_fee_bps?: number;
          platform_fixed_fee_cents?: number;
        };
        Relationships: [];
      };
      payments: {
        Row: {
          amount_cents: number;
          created_at: string;
          currency: string;
          description: string | null;
          driver_id: string;
          external_ref: string | null;
          failure_code: string | null;
          failure_message: string | null;
          id: string;
          metadata: Json;
          method: string;
          notice_id: string | null;
          operator_net_cents: number;
          paid_at: string | null;
          payout_status: string;
          platform_fee_cents: number;
          provider: string | null;
          provider_charge_id: string | null;
          provider_payment_id: string | null;
          reservation_id: string | null;
          refunded_cents: number;
          session_id: string | null;
          site_id: string | null;
          status: string;
          updated_at: string;
        };
        Insert: {
          amount_cents: number;
          created_at?: string;
          currency?: string;
          description?: string | null;
          driver_id: string;
          external_ref?: string | null;
          failure_code?: string | null;
          failure_message?: string | null;
          id?: string;
          metadata?: Json;
          method?: string;
          notice_id?: string | null;
          operator_net_cents?: number;
          paid_at?: string | null;
          payout_status?: string;
          platform_fee_cents?: number;
          provider?: string | null;
          provider_charge_id?: string | null;
          provider_payment_id?: string | null;
          reservation_id?: string | null;
          refunded_cents?: number;
          session_id?: string | null;
          site_id?: string | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          amount_cents?: number;
          created_at?: string;
          currency?: string;
          description?: string | null;
          driver_id?: string;
          external_ref?: string | null;
          failure_code?: string | null;
          failure_message?: string | null;
          id?: string;
          metadata?: Json;
          method?: string;
          notice_id?: string | null;
          operator_net_cents?: number;
          paid_at?: string | null;
          payout_status?: string;
          platform_fee_cents?: number;
          provider?: string | null;
          provider_charge_id?: string | null;
          provider_payment_id?: string | null;
          reservation_id?: string | null;
          refunded_cents?: number;
          session_id?: string | null;
          site_id?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payments_notice_id_fkey";
            columns: ["notice_id"];
            isOneToOne: false;
            referencedRelation: "notices";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_reservation_id_fkey";
            columns: ["reservation_id"];
            isOneToOne: false;
            referencedRelation: "reservations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_site_id_fkey";
            columns: ["site_id"];
            isOneToOne: false;
            referencedRelation: "sites";
            referencedColumns: ["id"];
          },
        ];
      };
      payment_webhook_events: {
        Row: {
          error_message: string | null;
          event_id: string;
          event_type: string;
          id: string;
          payload: Json;
          processed_at: string | null;
          provider: string;
          received_at: string;
          status: string;
        };
        Insert: {
          error_message?: string | null;
          event_id: string;
          event_type: string;
          id?: string;
          payload: Json;
          processed_at?: string | null;
          provider: string;
          received_at?: string;
          status?: string;
        };
        Update: {
          error_message?: string | null;
          event_id?: string;
          event_type?: string;
          id?: string;
          payload?: Json;
          processed_at?: string | null;
          provider?: string;
          received_at?: string;
          status?: string;
        };
        Relationships: [];
      };
      payouts: {
        Row: {
          created_at: string;
          id: string;
          org_id: string | null;
          paid_at: string | null;
          payout_ref: string | null;
          period_end: string;
          period_start: string;
          provider_id: string | null;
          status: string;
          total_gross_cents: number;
          total_net_cents: number;
          total_platform_fee_cents: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          org_id?: string | null;
          paid_at?: string | null;
          payout_ref?: string | null;
          period_end: string;
          period_start: string;
          provider_id?: string | null;
          status?: string;
          total_gross_cents?: number;
          total_net_cents?: number;
          total_platform_fee_cents?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          org_id?: string | null;
          paid_at?: string | null;
          payout_ref?: string | null;
          period_end?: string;
          period_start?: string;
          provider_id?: string | null;
          status?: string;
          total_gross_cents?: number;
          total_net_cents?: number;
          total_platform_fee_cents?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payouts_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "orgs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payouts_provider_id_fkey";
            columns: ["provider_id"];
            isOneToOne: false;
            referencedRelation: "providers";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          display_name: string | null;
          id: string;
          org_id: string | null;
          payment_method: string | null;
          phone: string | null;
          plate: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          display_name?: string | null;
          id: string;
          org_id?: string | null;
          payment_method?: string | null;
          phone?: string | null;
          plate?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          display_name?: string | null;
          id?: string;
          org_id?: string | null;
          payment_method?: string | null;
          phone?: string | null;
          plate?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "orgs";
            referencedColumns: ["id"];
          },
        ];
      };
      provider_credentials: {
        Row: {
          created_at: string;
          credential_ref: string;
          id: string;
          provider_id: string;
        };
        Insert: {
          created_at?: string;
          credential_ref: string;
          id?: string;
          provider_id: string;
        };
        Update: {
          created_at?: string;
          credential_ref?: string;
          id?: string;
          provider_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "provider_credentials_provider_id_fkey";
            columns: ["provider_id"];
            isOneToOne: false;
            referencedRelation: "providers";
            referencedColumns: ["id"];
          },
        ];
      };
      providers: {
        Row: {
          api_base_url: string | null;
          auth_type: Database["public"]["Enums"]["provider_auth"];
          contact_email: string | null;
          country: string;
          created_at: string;
          id: string;
          kind: Database["public"]["Enums"]["provider_kind"];
          last_sync_completed_at: string | null;
          last_sync_created: number;
          last_sync_error: string | null;
          last_sync_started_at: string | null;
          last_sync_status: string;
          last_sync_updated: number;
          name: string;
          notes: string | null;
          platform_fee_bps: number;
          platform_fixed_fee_cents: number;
          slug: string;
          status: Database["public"]["Enums"]["provider_status"];
          updated_at: string;
        };
        Insert: {
          api_base_url?: string | null;
          auth_type?: Database["public"]["Enums"]["provider_auth"];
          contact_email?: string | null;
          country?: string;
          created_at?: string;
          id?: string;
          kind?: Database["public"]["Enums"]["provider_kind"];
          last_sync_completed_at?: string | null;
          last_sync_created?: number;
          last_sync_error?: string | null;
          last_sync_started_at?: string | null;
          last_sync_status?: string;
          last_sync_updated?: number;
          name: string;
          notes?: string | null;
          platform_fee_bps?: number;
          platform_fixed_fee_cents?: number;
          slug: string;
          status?: Database["public"]["Enums"]["provider_status"];
          updated_at?: string;
        };
        Update: {
          api_base_url?: string | null;
          auth_type?: Database["public"]["Enums"]["provider_auth"];
          contact_email?: string | null;
          country?: string;
          created_at?: string;
          id?: string;
          kind?: Database["public"]["Enums"]["provider_kind"];
          last_sync_completed_at?: string | null;
          last_sync_created?: number;
          last_sync_error?: string | null;
          last_sync_started_at?: string | null;
          last_sync_status?: string;
          last_sync_updated?: number;
          name?: string;
          notes?: string | null;
          platform_fee_bps?: number;
          platform_fixed_fee_cents?: number;
          slug?: string;
          status?: Database["public"]["Enums"]["provider_status"];
          updated_at?: string;
        };
        Relationships: [];
      };
      reservations: {
        Row: {
          created_at: string;
          currency: string;
          driver_id: string;
          ends_at: string;
          id: string;
          plate: string;
          parking_charge_cents: number;
          price_cents: number;
          reservation_fee_cents: number;
          service_fee_cents: number;
          site_id: string;
          starts_at: string;
          status: string;
          tariff_plan_id: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          currency?: string;
          driver_id: string;
          ends_at: string;
          id?: string;
          plate: string;
          parking_charge_cents?: number;
          price_cents?: number;
          reservation_fee_cents?: number;
          service_fee_cents?: number;
          site_id: string;
          starts_at: string;
          status?: string;
          tariff_plan_id?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          currency?: string;
          driver_id?: string;
          ends_at?: string;
          id?: string;
          plate?: string;
          parking_charge_cents?: number;
          price_cents?: number;
          reservation_fee_cents?: number;
          service_fee_cents?: number;
          site_id?: string;
          starts_at?: string;
          status?: string;
          tariff_plan_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reservations_site_id_fkey";
            columns: ["site_id"];
            isOneToOne: false;
            referencedRelation: "sites";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reservations_tariff_plan_id_fkey";
            columns: ["tariff_plan_id"];
            isOneToOne: false;
            referencedRelation: "tariff_plans";
            referencedColumns: ["id"];
          },
        ];
      };
      parking_access_passes: {
        Row: {
          access_method: string;
          created_at: string;
          display_code: string | null;
          id: string;
          reservation_id: string | null;
          session_id: string | null;
          site_id: string;
          token_hash: string;
          used_at: string | null;
          user_id: string;
          valid_from: string;
          valid_until: string;
        };
        Insert: {
          access_method: string;
          created_at?: string;
          display_code?: string | null;
          id?: string;
          reservation_id?: string | null;
          session_id?: string | null;
          site_id: string;
          token_hash: string;
          used_at?: string | null;
          user_id: string;
          valid_from: string;
          valid_until: string;
        };
        Update: {
          access_method?: string;
          created_at?: string;
          display_code?: string | null;
          id?: string;
          reservation_id?: string | null;
          session_id?: string | null;
          site_id?: string;
          token_hash?: string;
          used_at?: string | null;
          user_id?: string;
          valid_from?: string;
          valid_until?: string;
        };
        Relationships: [
          {
            foreignKeyName: "parking_access_passes_reservation_id_fkey";
            columns: ["reservation_id"];
            isOneToOne: false;
            referencedRelation: "reservations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "parking_access_passes_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "parking_access_passes_site_id_fkey";
            columns: ["site_id"];
            isOneToOne: false;
            referencedRelation: "sites";
            referencedColumns: ["id"];
          },
        ];
      };
      site_operating_events: {
        Row: {
          capacity_delta: number | null;
          created_at: string;
          created_by: string | null;
          details: string | null;
          ends_at: string;
          event_type: string;
          id: string;
          site_id: string;
          starts_at: string;
          title: string;
        };
        Insert: {
          capacity_delta?: number | null;
          created_at?: string;
          created_by?: string | null;
          details?: string | null;
          ends_at: string;
          event_type: string;
          id?: string;
          site_id: string;
          starts_at: string;
          title: string;
        };
        Update: {
          capacity_delta?: number | null;
          created_at?: string;
          created_by?: string | null;
          details?: string | null;
          ends_at?: string;
          event_type?: string;
          id?: string;
          site_id?: string;
          starts_at?: string;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "site_operating_events_site_id_fkey";
            columns: ["site_id"];
            isOneToOne: false;
            referencedRelation: "sites";
            referencedColumns: ["id"];
          },
        ];
      };
      site_reports: {
        Row: {
          created_at: string;
          details: string;
          id: string;
          issue_type: string;
          resolved_at: string | null;
          site_id: string;
          status: string;
          user_id: string | null;
        };
        Insert: {
          created_at?: string;
          details: string;
          id?: string;
          issue_type: string;
          resolved_at?: string | null;
          site_id: string;
          status?: string;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          details?: string;
          id?: string;
          issue_type?: string;
          resolved_at?: string | null;
          site_id?: string;
          status?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "site_reports_site_id_fkey";
            columns: ["site_id"];
            isOneToOne: false;
            referencedRelation: "sites";
            referencedColumns: ["id"];
          },
        ];
      };
      support_requests: {
        Row: {
          category: string;
          created_at: string;
          details: string;
          id: string;
          priority: string;
          session_id: string | null;
          site_id: string | null;
          status: string;
          subject: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          category: string;
          created_at?: string;
          details: string;
          id?: string;
          priority?: string;
          session_id?: string | null;
          site_id?: string | null;
          status?: string;
          subject: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          category?: string;
          created_at?: string;
          details?: string;
          id?: string;
          priority?: string;
          session_id?: string | null;
          site_id?: string | null;
          status?: string;
          subject?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "support_requests_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "support_requests_site_id_fkey";
            columns: ["site_id"];
            isOneToOne: false;
            referencedRelation: "sites";
            referencedColumns: ["id"];
          },
        ];
      };
      tariff_plans: {
        Row: {
          created_at: string;
          daily_cap_cents: number | null;
          description: string | null;
          id: string;
          is_active: boolean;
          max_stay_minutes: number;
          minimum_charge_cents: number;
          name: string;
          price_cents_per_hour: number;
          priority: number;
          service_fee_cents: number;
          site_id: string;
          tariff_type: string;
          updated_at: string;
          valid_days: number[];
          valid_from: string | null;
          valid_until: string | null;
        };
        Insert: {
          created_at?: string;
          daily_cap_cents?: number | null;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          max_stay_minutes?: number;
          minimum_charge_cents?: number;
          name: string;
          price_cents_per_hour?: number;
          priority?: number;
          service_fee_cents?: number;
          site_id: string;
          tariff_type?: string;
          updated_at?: string;
          valid_days?: number[];
          valid_from?: string | null;
          valid_until?: string | null;
        };
        Update: {
          created_at?: string;
          daily_cap_cents?: number | null;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          max_stay_minutes?: number;
          minimum_charge_cents?: number;
          name?: string;
          price_cents_per_hour?: number;
          priority?: number;
          service_fee_cents?: number;
          site_id?: string;
          tariff_type?: string;
          updated_at?: string;
          valid_days?: number[];
          valid_from?: string | null;
          valid_until?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "tariff_plans_site_id_fkey";
            columns: ["site_id"];
            isOneToOne: false;
            referencedRelation: "sites";
            referencedColumns: ["id"];
          },
        ];
      };
      vehicles: {
        Row: {
          colour: string | null;
          country_code: string;
          created_at: string;
          id: string;
          is_default: boolean;
          make: string | null;
          model: string | null;
          nickname: string | null;
          registration: string;
          updated_at: string;
          usage_type: string;
          user_id: string;
        };
        Insert: {
          colour?: string | null;
          country_code?: string;
          created_at?: string;
          id?: string;
          is_default?: boolean;
          make?: string | null;
          model?: string | null;
          nickname?: string | null;
          registration: string;
          updated_at?: string;
          usage_type?: string;
          user_id: string;
        };
        Update: {
          colour?: string | null;
          country_code?: string;
          created_at?: string;
          id?: string;
          is_default?: boolean;
          make?: string | null;
          model?: string | null;
          nickname?: string | null;
          registration?: string;
          updated_at?: string;
          usage_type?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      settlement_items: {
        Row: {
          created_at: string;
          gross_cents: number;
          id: string;
          net_cents: number;
          payment_id: string;
          payout_id: string;
          platform_fee_cents: number;
        };
        Insert: {
          created_at?: string;
          gross_cents: number;
          id?: string;
          net_cents: number;
          payment_id: string;
          payout_id: string;
          platform_fee_cents: number;
        };
        Update: {
          created_at?: string;
          gross_cents?: number;
          id?: string;
          net_cents?: number;
          payment_id?: string;
          payout_id?: string;
          platform_fee_cents?: number;
        };
        Relationships: [
          {
            foreignKeyName: "settlement_items_payment_id_fkey";
            columns: ["payment_id"];
            isOneToOne: true;
            referencedRelation: "payments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "settlement_items_payout_id_fkey";
            columns: ["payout_id"];
            isOneToOne: false;
            referencedRelation: "payouts";
            referencedColumns: ["id"];
          },
        ];
      };
      sessions: {
        Row: {
          amount_cents: number;
          created_at: string;
          daily_cap_cents: number | null;
          ends_at: string;
          id: string;
          maximum_stay_minutes: number;
          minimum_charge_cents: number;
          payment_method: string | null;
          plate: string;
          price_cents_per_hour: number;
          service_fee_cents: number;
          site_id: string;
          started_at: string;
          status: Database["public"]["Enums"]["session_status"];
          tariff_plan_id: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          amount_cents?: number;
          created_at?: string;
          daily_cap_cents?: number | null;
          ends_at: string;
          id?: string;
          maximum_stay_minutes?: number;
          minimum_charge_cents?: number;
          payment_method?: string | null;
          plate: string;
          price_cents_per_hour: number;
          service_fee_cents?: number;
          site_id: string;
          started_at?: string;
          status?: Database["public"]["Enums"]["session_status"];
          tariff_plan_id?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          amount_cents?: number;
          created_at?: string;
          daily_cap_cents?: number | null;
          ends_at?: string;
          id?: string;
          maximum_stay_minutes?: number;
          minimum_charge_cents?: number;
          payment_method?: string | null;
          plate?: string;
          price_cents_per_hour?: number;
          service_fee_cents?: number;
          site_id?: string;
          started_at?: string;
          status?: Database["public"]["Enums"]["session_status"];
          tariff_plan_id?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sessions_site_id_fkey";
            columns: ["site_id"];
            isOneToOne: false;
            referencedRelation: "sites";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sessions_tariff_plan_id_fkey";
            columns: ["tariff_plan_id"];
            isOneToOne: false;
            referencedRelation: "tariff_plans";
            referencedColumns: ["id"];
          },
        ];
      };
      site_provider_mapping: {
        Row: {
          created_at: string;
          external_site_id: string;
          id: string;
          last_synced_at: string | null;
          provider_id: string;
          site_id: string;
        };
        Insert: {
          created_at?: string;
          external_site_id: string;
          id?: string;
          last_synced_at?: string | null;
          provider_id: string;
          site_id: string;
        };
        Update: {
          created_at?: string;
          external_site_id?: string;
          id?: string;
          last_synced_at?: string | null;
          provider_id?: string;
          site_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "site_provider_mapping_provider_id_fkey";
            columns: ["provider_id"];
            isOneToOne: false;
            referencedRelation: "providers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "site_provider_mapping_site_id_fkey";
            columns: ["site_id"];
            isOneToOne: true;
            referencedRelation: "sites";
            referencedColumns: ["id"];
          },
        ];
      };
      sites: {
        Row: {
          access_method: string;
          accessible_bays: number;
          address: string;
          amenities: string[];
          availability_status: string;
          availability_updated_at: string;
          capacity: number;
          created_at: string;
          daily_cap_cents: number | null;
          entrance_lat: number | null;
          entrance_lng: number | null;
          entrance_notes: string | null;
          ev_bays: number;
          grace_period_minutes: number;
          height_limit_cm: number | null;
          id: string;
          is_open: boolean;
          lat: number;
          lng: number;
          max_stay_minutes: number;
          name: string;
          occupied: number;
          opening_hours: Json;
          operator_name: string | null;
          org_id: string | null;
          platform_fee_bps: number | null;
          platform_fixed_fee_cents: number | null;
          price_cents_per_hour: number;
          reservable: boolean;
          reservation_fee_cents: number;
          type: Database["public"]["Enums"]["site_type"];
          updated_at: string;
        };
        Insert: {
          access_method?: string;
          accessible_bays?: number;
          address: string;
          amenities?: string[];
          availability_status?: string;
          availability_updated_at?: string;
          capacity: number;
          created_at?: string;
          daily_cap_cents?: number | null;
          entrance_lat?: number | null;
          entrance_lng?: number | null;
          entrance_notes?: string | null;
          ev_bays?: number;
          grace_period_minutes?: number;
          height_limit_cm?: number | null;
          id?: string;
          is_open?: boolean;
          lat: number;
          lng: number;
          max_stay_minutes?: number;
          name: string;
          occupied?: number;
          opening_hours?: Json;
          operator_name?: string | null;
          org_id?: string | null;
          platform_fee_bps?: number | null;
          platform_fixed_fee_cents?: number | null;
          price_cents_per_hour: number;
          reservable?: boolean;
          reservation_fee_cents?: number;
          type?: Database["public"]["Enums"]["site_type"];
          updated_at?: string;
        };
        Update: {
          access_method?: string;
          accessible_bays?: number;
          address?: string;
          amenities?: string[];
          availability_status?: string;
          availability_updated_at?: string;
          capacity?: number;
          created_at?: string;
          daily_cap_cents?: number | null;
          entrance_lat?: number | null;
          entrance_lng?: number | null;
          entrance_notes?: string | null;
          ev_bays?: number;
          grace_period_minutes?: number;
          height_limit_cm?: number | null;
          id?: string;
          is_open?: boolean;
          lat?: number;
          lng?: number;
          max_stay_minutes?: number;
          name?: string;
          occupied?: number;
          opening_hours?: Json;
          operator_name?: string | null;
          org_id?: string | null;
          platform_fee_bps?: number | null;
          platform_fixed_fee_cents?: number | null;
          price_cents_per_hour?: number;
          reservable?: boolean;
          reservation_fee_cents?: number;
          type?: Database["public"]["Enums"]["site_type"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sites_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "orgs";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          org_id: string | null;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          org_id?: string | null;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          org_id?: string | null;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_roles_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "orgs";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      cancel_parking_reservation: {
        Args: { _reservation_id: string };
        Returns: Database["public"]["Tables"]["reservations"]["Row"];
      };
      check_parking_session: {
        Args: { _plate: string; _site_id: string };
        Returns: Json;
      };
      calculate_platform_fee: {
        Args: {
          _amount_cents: number;
          _org_id: string | null;
          _provider_id: string | null;
          _site_id: string;
        };
        Returns: {
          operator_net_cents: number;
          platform_fee_cents: number;
        }[];
      };
      create_operator_site: {
        Args: {
          _address: string;
          _amenities?: string[];
          _capacity: number;
          _lat: number;
          _lng: number;
          _name: string;
          _operator_name: string;
          _price_cents_per_hour: number;
          _type?: Database["public"]["Enums"]["site_type"];
        };
        Returns: Database["public"]["Tables"]["sites"]["Row"];
      };
      create_business_account: {
        Args: { _billing_email?: string | null; _name: string; _vat_id?: string | null };
        Returns: Database["public"]["Tables"]["business_accounts"]["Row"];
      };
      create_notice_appeal: {
        Args: { _details: string; _notice_id: string; _reason: string };
        Returns: Database["public"]["Tables"]["notice_appeals"]["Row"];
      };
      create_notice_payment: {
        Args: { _notice_id: string };
        Returns: Database["public"]["Tables"]["payments"]["Row"];
      };
      create_settlement_batch: {
        Args: { _period_end: string; _period_start: string };
        Returns: Database["public"]["Tables"]["payouts"]["Row"][];
      };
      consume_api_rate_limit: {
        Args: { _api_key_id: string; _request_limit: number; _window_seconds?: number };
        Returns: boolean;
      };
      claim_notification_deliveries: {
        Args: { _limit?: number };
        Returns: Database["public"]["Tables"]["notification_deliveries"]["Row"][];
      };
      create_parking_reservation: {
        Args: {
          _minutes: number;
          _plate: string;
          _site_id: string;
          _starts_at: string;
        };
        Returns: Database["public"]["Tables"]["reservations"]["Row"];
      };
      end_parking_session: {
        Args: { _session_id: string };
        Returns: Json;
      };
      extend_parking_session: {
        Args: { _minutes: number; _session_id: string };
        Returns: Database["public"]["Tables"]["sessions"]["Row"];
      };
      get_operator_sites: {
        Args: Record<PropertyKey, never>;
        Returns: Database["public"]["Tables"]["sites"]["Row"][];
      };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      is_org_member: { Args: { _org_id: string }; Returns: boolean };
      is_business_admin: { Args: { _business_id: string }; Returns: boolean };
      is_business_member: { Args: { _business_id: string }; Returns: boolean };
      is_operator_org_member: { Args: { _org_id: string }; Returns: boolean };
      issue_parking_notice: {
        Args: {
          _amount_cents: number;
          _plate: string;
          _reason: string;
          _site_id: string;
        };
        Returns: Database["public"]["Tables"]["notices"]["Row"];
      };
      issue_parking_notice_v2: {
        Args: {
          _amount_cents: number;
          _evidence?: Json;
          _plate: string;
          _reason: string;
          _site_id: string;
        };
        Returns: Database["public"]["Tables"]["notices"]["Row"];
      };
      mark_notification_read: {
        Args: { _notification_id: string };
        Returns: Database["public"]["Tables"]["notifications"]["Row"];
      };
      mark_payout_paid: {
        Args: { _payout_id: string; _payout_ref: string };
        Returns: Database["public"]["Tables"]["payouts"]["Row"];
      };
      resolve_notice_appeal: {
        Args: { _appeal_id: string; _decision: string; _response: string };
        Returns: Database["public"]["Tables"]["notice_appeals"]["Row"];
      };
      session_amount_cents: { Args: { _session_id: string }; Returns: number };
      start_parking_session: {
        Args: {
          _minutes: number;
          _payment_method?: string | null;
          _plate: string;
          _site_id: string;
        };
        Returns: Database["public"]["Tables"]["sessions"]["Row"];
      };
      update_operator_site: {
        Args: {
          _occupied?: number | null;
          _price_cents_per_hour?: number | null;
          _site_id: string;
        };
        Returns: Database["public"]["Tables"]["sites"]["Row"];
      };
      update_site_experience: {
        Args: {
          _access_method?: string | null;
          _accessible_bays?: number | null;
          _daily_cap_cents?: number | null;
          _entrance_notes?: string | null;
          _ev_bays?: number | null;
          _height_limit_cm?: number | null;
          _is_open?: boolean | null;
          _max_stay_minutes?: number | null;
          _reservable?: boolean | null;
          _site_id: string;
        };
        Returns: Database["public"]["Tables"]["sites"]["Row"];
      };
      upsert_tariff_plan: {
        Args: {
          _daily_cap_cents: number | null;
          _id: string | null;
          _is_active: boolean;
          _max_stay_minutes: number;
          _minimum_charge_cents: number;
          _name: string;
          _price_cents_per_hour: number;
          _service_fee_cents: number;
          _site_id: string;
          _tariff_type: string;
        };
        Returns: Database["public"]["Tables"]["tariff_plans"]["Row"];
      };
      update_parking_notice_status: {
        Args: { _notice_id: string; _status: string };
        Returns: Database["public"]["Tables"]["notices"]["Row"];
      };
    };
    Enums: {
      app_role: "admin" | "operator" | "provider" | "enforcement";
      org_kind: "operator" | "provider";
      provider_auth: "none" | "api_key" | "oauth2" | "basic";
      provider_kind: "operator" | "municipal" | "datex" | "handyparken" | "other";
      provider_status: "active" | "paused" | "onboarding";
      session_status: "active" | "ended" | "cancelled";
      site_type: "street" | "garage" | "lot";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

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
} as const;
