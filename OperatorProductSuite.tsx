import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";
import { normalizeEuropeanPlate } from "@/lib/product-domain";

export type Vehicle = Database["public"]["Tables"]["vehicles"]["Row"];
export type DriverPreference = Database["public"]["Tables"]["driver_preferences"]["Row"];
export type FavouriteSite = Database["public"]["Tables"]["favourite_sites"]["Row"];
export type TariffPlan = Database["public"]["Tables"]["tariff_plans"]["Row"];
export type BusinessAccount = Database["public"]["Tables"]["business_accounts"]["Row"];
export type BusinessMember = Database["public"]["Tables"]["business_members"]["Row"];
export type CostCentre = Database["public"]["Tables"]["cost_centres"]["Row"];
export type BusinessVehicle = Database["public"]["Tables"]["business_vehicles"]["Row"];
export type SupportRequest = Database["public"]["Tables"]["support_requests"]["Row"];
export type SiteReport = Database["public"]["Tables"]["site_reports"]["Row"];
export type ParkingAccessPass = Database["public"]["Tables"]["parking_access_passes"]["Row"];

const PRODUCT_KEYS = {
  vehicles: ["product", "vehicles"] as const,
  preferences: ["product", "preferences"] as const,
  favourites: ["product", "favourites"] as const,
  tariffs: ["product", "tariffs"] as const,
  business: ["product", "business"] as const,
  support: ["product", "support"] as const,
  reports: ["product", "site-reports"] as const,
  access: ["product", "access-passes"] as const,
};

export function useParkingAccessPasses() {
  return useQuery({
    queryKey: PRODUCT_KEYS.access,
    queryFn: async (): Promise<ParkingAccessPass[]> => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user.id) return [];
      const { data, error } = await supabase
        .from("parking_access_passes")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

async function currentUserId() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const userId = data.session?.user.id;
  if (!userId) throw new Error("Sign in to use this feature");
  return userId;
}

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

export function useAddVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      registration: string;
      countryCode: string;
      nickname?: string;
      usageType?: string;
      make?: string;
      model?: string;
      isDefault?: boolean;
    }) => {
      const userId = await currentUserId();
      const registration = normalizeEuropeanPlate(input.registration, input.countryCode);
      if (input.isDefault) {
        const { error: clearError } = await supabase
          .from("vehicles")
          .update({ is_default: false })
          .eq("user_id", userId);
        if (clearError) throw clearError;
      }
      const { data, error } = await supabase
        .from("vehicles")
        .insert({
          user_id: userId,
          registration,
          country_code: input.countryCode.toUpperCase(),
          nickname: input.nickname?.trim() || null,
          usage_type: input.usageType ?? "private",
          make: input.make?.trim() || null,
          model: input.model?.trim() || null,
          is_default: input.isDefault ?? false,
        })
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PRODUCT_KEYS.vehicles }),
  });
}

export function useSetDefaultVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vehicleId: string) => {
      const userId = await currentUserId();
      const { error: clearError } = await supabase
        .from("vehicles")
        .update({ is_default: false })
        .eq("user_id", userId);
      if (clearError) throw clearError;
      const { error } = await supabase
        .from("vehicles")
        .update({ is_default: true })
        .eq("id", vehicleId)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PRODUCT_KEYS.vehicles }),
  });
}

export function useDeleteVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vehicleId: string) => {
      const { error } = await supabase.from("vehicles").delete().eq("id", vehicleId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PRODUCT_KEYS.vehicles }),
  });
}

export function useDriverPreferences() {
  return useQuery({
    queryKey: PRODUCT_KEYS.preferences,
    queryFn: async (): Promise<DriverPreference | null> => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user.id) return null;
      const { data, error } = await supabase
        .from("driver_preferences")
        .select("*")
        .eq("user_id", session.session.user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateDriverPreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (patch: {
      active_profile?: string;
      locale?: string;
      default_payment_method?: string;
      notifications?: Json;
      accessibility?: Json;
    }) => {
      const userId = await currentUserId();
      const { data, error } = await supabase
        .from("driver_preferences")
        .upsert({ user_id: userId, ...patch }, { onConflict: "user_id" })
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PRODUCT_KEYS.preferences }),
  });
}

export function useFavouriteSites() {
  return useQuery({
    queryKey: PRODUCT_KEYS.favourites,
    queryFn: async (): Promise<FavouriteSite[]> => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user.id) return [];
      const { data, error } = await supabase.from("favourite_sites").select("*");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useToggleFavouriteSite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ siteId, isFavourite }: { siteId: string; isFavourite: boolean }) => {
      const userId = await currentUserId();
      if (isFavourite) {
        const { error } = await supabase
          .from("favourite_sites")
          .delete()
          .eq("user_id", userId)
          .eq("site_id", siteId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("favourite_sites")
          .insert({ user_id: userId, site_id: siteId });
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PRODUCT_KEYS.favourites }),
  });
}

export function useTariffPlans(siteId?: string) {
  return useQuery({
    queryKey: [...PRODUCT_KEYS.tariffs, siteId ?? "all"],
    queryFn: async (): Promise<TariffPlan[]> => {
      let query = supabase.from("tariff_plans").select("*").order("priority");
      if (siteId) query = query.eq("site_id", siteId);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUpsertTariffPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id?: string | null;
      siteId: string;
      name: string;
      tariffType: string;
      priceCentsPerHour: number;
      minimumChargeCents: number;
      serviceFeeCents: number;
      dailyCapCents: number | null;
      maxStayMinutes: number;
      isActive: boolean;
    }) => {
      const { data, error } = await supabase.rpc("upsert_tariff_plan", {
        _id: input.id ?? null,
        _site_id: input.siteId,
        _name: input.name,
        _tariff_type: input.tariffType,
        _price_cents_per_hour: input.priceCentsPerHour,
        _minimum_charge_cents: input.minimumChargeCents,
        _service_fee_cents: input.serviceFeeCents,
        _daily_cap_cents: input.dailyCapCents,
        _max_stay_minutes: input.maxStayMinutes,
        _is_active: input.isActive,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PRODUCT_KEYS.tariffs }),
  });
}

export function useUpdateSiteExperience() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      siteId: string;
      isOpen?: boolean;
      reservable?: boolean;
      dailyCapCents?: number | null;
      maxStayMinutes?: number;
      heightLimitCm?: number | null;
      accessibleBays?: number;
      evBays?: number;
      accessMethod?: string;
      entranceNotes?: string;
    }) => {
      const { data, error } = await supabase.rpc("update_site_experience", {
        _site_id: input.siteId,
        _is_open: input.isOpen,
        _reservable: input.reservable,
        _daily_cap_cents: input.dailyCapCents,
        _max_stay_minutes: input.maxStayMinutes,
        _height_limit_cm: input.heightLimitCm,
        _accessible_bays: input.accessibleBays,
        _ev_bays: input.evBays,
        _access_method: input.accessMethod,
        _entrance_notes: input.entranceNotes,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sites"] });
      queryClient.invalidateQueries({ queryKey: ["operator-sites"] });
    },
  });
}

export function useBusinessWorkspace() {
  return useQuery({
    queryKey: PRODUCT_KEYS.business,
    queryFn: async () => {
      const [accounts, members, centres, vehicles] = await Promise.all([
        supabase.from("business_accounts").select("*").order("created_at"),
        supabase.from("business_members").select("*").order("created_at"),
        supabase.from("cost_centres").select("*").order("code"),
        supabase.from("business_vehicles").select("*").order("created_at"),
      ]);
      const firstError = accounts.error ?? members.error ?? centres.error ?? vehicles.error;
      if (firstError) throw firstError;
      return {
        accounts: (accounts.data ?? []) as BusinessAccount[],
        members: (members.data ?? []) as BusinessMember[],
        costCentres: (centres.data ?? []) as CostCentre[],
        businessVehicles: (vehicles.data ?? []) as BusinessVehicle[],
      };
    },
  });
}

export function useCreateBusinessAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; billingEmail?: string; vatId?: string }) => {
      const { data, error } = await supabase.rpc("create_business_account", {
        _name: input.name,
        _billing_email: input.billingEmail ?? null,
        _vat_id: input.vatId ?? null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PRODUCT_KEYS.business }),
  });
}

export function useAddCostCentre() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { businessId: string; code: string; name: string }) => {
      const { data, error } = await supabase
        .from("cost_centres")
        .insert({
          business_id: input.businessId,
          code: input.code.trim().toUpperCase(),
          name: input.name.trim(),
        })
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PRODUCT_KEYS.business }),
  });
}

export function useAssignBusinessVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      businessId: string;
      vehicleId: string;
      costCentreId?: string | null;
      monthlyLimitCents?: number | null;
    }) => {
      const { data, error } = await supabase
        .from("business_vehicles")
        .upsert(
          {
            business_id: input.businessId,
            vehicle_id: input.vehicleId,
            cost_centre_id: input.costCentreId ?? null,
            monthly_limit_cents: input.monthlyLimitCents ?? null,
          },
          { onConflict: "business_id,vehicle_id" },
        )
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PRODUCT_KEYS.business }),
  });
}

export function useSupportRequests() {
  return useQuery({
    queryKey: PRODUCT_KEYS.support,
    queryFn: async (): Promise<SupportRequest[]> => {
      const { data, error } = await supabase
        .from("support_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateSupportRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      category: string;
      subject: string;
      details: string;
      priority?: string;
      siteId?: string | null;
      sessionId?: string | null;
    }) => {
      const userId = await currentUserId();
      const { data, error } = await supabase
        .from("support_requests")
        .insert({
          user_id: userId,
          category: input.category,
          subject: input.subject.trim(),
          details: input.details.trim(),
          priority: input.priority ?? "normal",
          site_id: input.siteId ?? null,
          session_id: input.sessionId ?? null,
        })
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PRODUCT_KEYS.support }),
  });
}

export function useCreateSiteReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { siteId: string; issueType: string; details: string }) => {
      const userId = await currentUserId();
      const { data, error } = await supabase
        .from("site_reports")
        .insert({
          user_id: userId,
          site_id: input.siteId,
          issue_type: input.issueType,
          details: input.details.trim(),
        })
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PRODUCT_KEYS.reports }),
  });
}

export function useSiteReports() {
  return useQuery({
    queryKey: PRODUCT_KEYS.reports,
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
