import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { normalizeEuropeanPlate } from "@/lib/product-domain";

export type Vehicle = Database["public"]["Tables"]["vehicles"]["Row"];
export type DriverPreference = Database["public"]["Tables"]["driver_preferences"]["Row"];
export type FavouriteSite = Database["public"]["Tables"]["favourite_sites"]["Row"];
export type TariffPlan = Database["public"]["Tables"]["tariff_plans"]["Row"];
export type BusinessAccount = Database["public"]["Tables"]["business_accounts"]["Row"];
export type BusinessMember = Database["public"]["Tables"]["business_members"]["Row"];
export type CostCentre = Database["public"]["Tables"]["cost_centres"]["Row"];
export type AccessPass = Database["public"]["Tables"]["access_passes"]["Row"];
export type SupportCase = Database["public"]["Tables"]["support_cases"]["Row"];
export type SupportMessage = Database["public"]["Tables"]["support_messages"]["Row"];
export type SiteReport = Database["public"]["Tables"]["site_reports"]["Row"];
export type NoticeDraft = Database["public"]["Tables"]["notice_drafts"]["Row"];

export const PRODUCT_KEYS = {
  vehicles: ["vehicles"] as const,
  preferences: ["driver-preferences"] as const,
  favourites: ["favourite-sites"] as const,
  tariffs: ["tariff-plans"] as const,
  business: ["business-accounts"] as const,
  costCentres: ["cost-centres"] as const,
  accessPasses: ["access-passes"] as const,
  supportCases: ["support-cases"] as const,
  siteReports: ["site-reports"] as const,
  noticeDrafts: ["notice-drafts"] as const,
};

async function currentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Not signed in");
  return data.user.id;
}

/* ------------------------------- vehicles ------------------------------- */

export function useVehicles() {
  return useQuery({
    queryKey: PRODUCT_KEYS.vehicles,
    queryFn: async (): Promise<Vehicle[]> => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .order("is_default", { ascending: false })
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSaveVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id?: string;
      plate: string;
      country: string;
      label?: string | null;
      is_default?: boolean;
      is_electric?: boolean;
      accessibility_permit?: boolean;
      business_account_id?: string | null;
      cost_centre_id?: string | null;
    }) => {
      const user_id = await currentUserId();
      const payload = {
        ...input,
        user_id,
        plate: normalizeEuropeanPlate(input.plate),
      };
      if (input.is_default) {
        await supabase.from("vehicles").update({ is_default: false }).eq("user_id", user_id);
      }
      const { error } = input.id
        ? await supabase.from("vehicles").update(payload).eq("id", input.id)
        : await supabase.from("vehicles").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: PRODUCT_KEYS.vehicles }),
  });
}

export function useDeleteVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vehicles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: PRODUCT_KEYS.vehicles }),
  });
}

/* ----------------------------- preferences ------------------------------ */

export function useDriverPreferences() {
  return useQuery({
    queryKey: PRODUCT_KEYS.preferences,
    queryFn: async (): Promise<DriverPreference | null> => {
      const { data, error } = await supabase.from("driver_preferences").select("*").maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useSavePreferences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<Omit<DriverPreference, "user_id">>) => {
      const user_id = await currentUserId();
      const { error } = await supabase
        .from("driver_preferences")
        .upsert({ ...patch, user_id }, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: PRODUCT_KEYS.preferences }),
  });
}

/* ------------------------------ favourites ------------------------------ */

export function useFavourites() {
  return useQuery({
    queryKey: PRODUCT_KEYS.favourites,
    queryFn: async (): Promise<FavouriteSite[]> => {
      const { data, error } = await supabase
        .from("favourite_sites")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useToggleFavourite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ siteId, favourite }: { siteId: string; favourite: boolean }) => {
      const user_id = await currentUserId();
      const { error } = favourite
        ? await supabase.from("favourite_sites").insert({ user_id, site_id: siteId })
        : await supabase.from("favourite_sites").delete().eq("user_id", user_id).eq("site_id", siteId);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: PRODUCT_KEYS.favourites }),
  });
}

/* -------------------------------- tariffs ------------------------------- */

export function useTariffPlans() {
  return useQuery({
    queryKey: PRODUCT_KEYS.tariffs,
    queryFn: async (): Promise<TariffPlan[]> => {
      const { data, error } = await supabase.from("tariff_plans").select("*").eq("active", true);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSaveTariffPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: Partial<TariffPlan> & { site_id: string; id?: string },
    ) => {
      const { id, ...rest } = input;
      const { error } = id
        ? await supabase.from("tariff_plans").update(rest).eq("id", id)
        : await supabase.from("tariff_plans").insert({ ...rest, site_id: input.site_id });
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: PRODUCT_KEYS.tariffs }),
  });
}

/* --------------------------- business / fleet --------------------------- */

export function useBusinessAccounts() {
  return useQuery({
    queryKey: PRODUCT_KEYS.business,
    queryFn: async (): Promise<BusinessAccount[]> => {
      const { data, error } = await supabase.from("business_accounts").select("*").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateBusinessAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; billing_email?: string; monthly_limit_cents?: number }) => {
      const owner_user_id = await currentUserId();
      const { data, error } = await supabase
        .from("business_accounts")
        .insert({ ...input, owner_user_id })
        .select("id")
        .single();
      if (error) throw error;
      await supabase
        .from("business_members")
        .insert({ account_id: data.id, user_id: owner_user_id, role: "owner" });
      return data.id;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: PRODUCT_KEYS.business }),
  });
}

export function useCostCentres() {
  return useQuery({
    queryKey: PRODUCT_KEYS.costCentres,
    queryFn: async (): Promise<CostCentre[]> => {
      const { data, error } = await supabase.from("cost_centres").select("*").order("code");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSaveCostCentre() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      account_id: string;
      code: string;
      name: string;
      budget_cents?: number;
    }) => {
      const { error } = await supabase.from("cost_centres").insert(input);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: PRODUCT_KEYS.costCentres }),
  });
}

/* ----------------------------- access passes ---------------------------- */

export function useAccessPasses() {
  return useQuery({
    queryKey: PRODUCT_KEYS.accessPasses,
    queryFn: async (): Promise<AccessPass[]> => {
      const { data, error } = await supabase
        .from("access_passes")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });
}

/* -------------------------------- support ------------------------------- */

export function useSupportCases() {
  return useQuery({
    queryKey: PRODUCT_KEYS.supportCases,
    queryFn: async (): Promise<SupportCase[]> => {
      const { data, error } = await supabase
        .from("support_cases")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateSupportCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { subject: string; category: string; body: string }) => {
      const user_id = await currentUserId();
      const { data, error } = await supabase
        .from("support_cases")
        .insert({ user_id, subject: input.subject, category: input.category })
        .select("id")
        .single();
      if (error) throw error;
      const { error: msgError } = await supabase
        .from("support_messages")
        .insert({ case_id: data.id, author_id: user_id, body: input.body });
      if (msgError) throw msgError;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: PRODUCT_KEYS.supportCases }),
  });
}

/* ----------------------------- site reports ----------------------------- */

export function useSiteReports() {
  return useQuery({
    queryKey: PRODUCT_KEYS.siteReports,
    queryFn: async (): Promise<SiteReport[]> => {
      const { data, error } = await supabase
        .from("site_reports")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useReportSite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { site_id: string; category: string; details: string }) => {
      const reporter_id = await currentUserId();
      const { error } = await supabase.from("site_reports").insert({ ...input, reporter_id });
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: PRODUCT_KEYS.siteReports }),
  });
}

/* -------------------------- enforcement drafts -------------------------- */

export function useNoticeDrafts() {
  return useQuery({
    queryKey: PRODUCT_KEYS.noticeDrafts,
    queryFn: async (): Promise<NoticeDraft[]> => {
      const { data, error } = await supabase
        .from("notice_drafts")
        .select("*")
        .eq("status", "draft")
        .order("captured_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSaveNoticeDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      site_id?: string | null;
      plate: string;
      reason: string;
      amount_cents: number;
      evidence?: Record<string, unknown>;
    }) => {
      const officer_id = await currentUserId();
      const { error } = await supabase.from("notice_drafts").insert({
        officer_id,
        site_id: input.site_id ?? null,
        plate: normalizeEuropeanPlate(input.plate),
        reason: input.reason,
        amount_cents: input.amount_cents,
        evidence: (input.evidence ?? {}) as never,
      });
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: PRODUCT_KEYS.noticeDrafts }),
  });
}

export function useDiscardNoticeDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notice_drafts")
        .update({ status: "discarded" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: PRODUCT_KEYS.noticeDrafts }),
  });
}

export function useMarkDraftSubmitted() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, noticeId }: { id: string; noticeId: string }) => {
      const { error } = await supabase
        .from("notice_drafts")
        .update({ status: "submitted", notice_id: noticeId })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: PRODUCT_KEYS.noticeDrafts }),
  });
}