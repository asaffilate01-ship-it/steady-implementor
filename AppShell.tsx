import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Provider = Database["public"]["Tables"]["providers"]["Row"];
export type ApiKey = Database["public"]["Tables"]["api_keys"]["Row"];
export type SafeApiKey = Pick<
  ApiKey,
  | "id"
  | "provider_id"
  | "owner_user_id"
  | "name"
  | "key_prefix"
  | "scopes"
  | "last_used_at"
  | "revoked_at"
  | "created_at"
>;
export type ApiRequestLog = Database["public"]["Tables"]["api_request_log"]["Row"];
export type SiteProviderMapping = Database["public"]["Tables"]["site_provider_mapping"]["Row"];

export const PKEYS = {
  providers: ["providers"] as const,
  apiKeys: ["api_keys"] as const,
  requestLog: ["api_request_log"] as const,
  mapping: ["site_provider_mapping"] as const,
};

export function useProviders() {
  return useQuery({
    queryKey: PKEYS.providers,
    queryFn: async (): Promise<Provider[]> => {
      const { data, error } = await supabase.from("providers").select("*").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useMyApiKeys() {
  return useQuery({
    queryKey: PKEYS.apiKeys,
    queryFn: async (): Promise<SafeApiKey[]> => {
      const { data, error } = await supabase
        .from("api_keys")
        .select(
          "id, provider_id, owner_user_id, name, key_prefix, scopes, last_used_at, revoked_at, created_at",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useApiRequestLog(limit = 50) {
  return useQuery({
    queryKey: [...PKEYS.requestLog, limit],
    queryFn: async (): Promise<ApiRequestLog[]> => {
      const { data, error } = await supabase
        .from("api_request_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 10_000,
  });
}

export function useSiteMappings() {
  return useQuery({
    queryKey: PKEYS.mapping,
    queryFn: async (): Promise<SiteProviderMapping[]> => {
      const { data, error } = await supabase.from("site_provider_mapping").select("*");
      if (error) throw error;
      return data ?? [];
    },
  });
}
