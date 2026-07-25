import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useEffect } from "react";

export type Site = Database["public"]["Tables"]["sites"]["Row"];
export type Session = Database["public"]["Tables"]["sessions"]["Row"];
export type Notice = Database["public"]["Tables"]["notices"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type SiteInsert = Database["public"]["Tables"]["sites"]["Insert"];

export const KEYS = {
  sites: ["sites"] as const,
  sessions: ["sessions"] as const,
  myActive: ["sessions", "my-active"] as const,
  notices: ["notices"] as const,
  profile: ["profile"] as const,
};

export function euros(cents: number) {
  return "€" + (cents / 100).toFixed(2);
}
export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function useSites() {
  return useQuery({
    queryKey: KEYS.sites,
    queryFn: async (): Promise<Site[]> => {
      const { data, error } = await supabase.from("sites").select("*").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** All sessions visible to the caller (RLS-scoped). */
export function useSessions() {
  return useQuery({
    queryKey: KEYS.sessions,
    queryFn: async (): Promise<Session[]> => {
      const { data, error } = await supabase.from("sessions").select("*").order("started_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useNotices() {
  return useQuery({
    queryKey: KEYS.notices,
    queryFn: async (): Promise<Notice[]> => {
      const { data, error } = await supabase.from("notices").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useMyProfile() {
  return useQuery({
    queryKey: KEYS.profile,
    queryFn: async (): Promise<Profile | null> => {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user.id;
      if (!uid) return null;
      const { data, error } = await supabase.from("profiles").select("*").eq("id", uid).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<Pick<Profile, "plate" | "payment_method" | "display_name">>) => {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user.id;
      if (!uid) throw new Error("Not signed in");
      const { error } = await supabase.from("profiles").update(patch).eq("id", uid);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.profile }),
  });
}

export function useStartSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ site, minutes, plate, paymentMethod }: { site: Site; minutes: number; plate: string; paymentMethod: string | null }) => {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user.id;
      if (!uid) throw new Error("Sign in to start a session");
      const startedAt = new Date();
      const endsAt = new Date(startedAt.getTime() + minutes * 60_000);
      const amount = Math.round((site.price_cents_per_hour * minutes) / 60);
      const { data, error } = await supabase
        .from("sessions")
        .insert({
          user_id: uid,
          site_id: site.id,
          plate,
          started_at: startedAt.toISOString(),
          ends_at: endsAt.toISOString(),
          price_cents_per_hour: site.price_cents_per_hour,
          amount_cents: amount,
          payment_method: paymentMethod,
          status: "active",
        })
        .select()
        .single();
      if (error) throw error;
      return data as Session;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.sessions });
      qc.invalidateQueries({ queryKey: KEYS.sites });
    },
  });
}

export function useEndSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("sessions")
        .update({ status: "ended", ends_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.sessions });
      qc.invalidateQueries({ queryKey: KEYS.sites });
    },
  });
}

export function useExtendSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ session, minutes }: { session: Session; minutes: number }) => {
      const newEnds = new Date(new Date(session.ends_at).getTime() + minutes * 60_000);
      const add = Math.round((session.price_cents_per_hour * minutes) / 60);
      const { error } = await supabase
        .from("sessions")
        .update({ ends_at: newEnds.toISOString(), amount_cents: session.amount_cents + add })
        .eq("id", session.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.sessions }),
  });
}

export function useUpdateSite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Site> }) => {
      const { error } = await supabase.from("sites").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.sites }),
  });
}

export function useAddSite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (site: SiteInsert) => {
      const { data, error } = await supabase.from("sites").insert(site).select().single();
      if (error) throw error;
      return data as Site;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.sites }),
  });
}

export function useIssueNotice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (n: { site_id: string; plate: string; reason: string; amount_cents: number }) => {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user.id ?? null;
      const { data, error } = await supabase
        .from("notices")
        .insert({ ...n, issued_by: uid })
        .select()
        .single();
      if (error) throw error;
      return data as Notice;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.notices }),
  });
}

/** Subscribe to realtime changes on the given tables and invalidate matching queries. */
export function useRealtimeSync(tables: Array<"sites" | "sessions" | "notices">) {
  const qc = useQueryClient();
  useEffect(() => {
    const chan = supabase.channel("pp-live");
    for (const t of tables) {
      chan.on(
        "postgres_changes" as never,
        { event: "*", schema: "public", table: t } as never,
        () => qc.invalidateQueries({ queryKey: [t] }),
      );
    }
    chan.subscribe();
    return () => {
      supabase.removeChannel(chan);
    };
  }, [qc, tables.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps
}