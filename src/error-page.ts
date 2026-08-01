import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  cancelParkingReservationFn,
  createNoticeAppealFn,
  createNoticePaymentFn,
  createOperatorSiteFn,
  createParkingReservationFn,
  endParkingSessionFn,
  extendParkingSessionFn,
  issueParkingNoticeFn,
  listOperatorSitesFn,
  markNotificationReadFn,
  resolveNoticeAppealFn,
  startParkingSessionFn,
  updateOperatorSiteFn,
  updateParkingNoticeStatusFn,
} from "@/lib/parking.functions";

export type Site = Database["public"]["Tables"]["sites"]["Row"];
export type Session = Database["public"]["Tables"]["sessions"]["Row"];
export type Notice = Database["public"]["Tables"]["notices"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type SiteInsert = Database["public"]["Tables"]["sites"]["Insert"];
export type Payment = Database["public"]["Tables"]["payments"]["Row"];
export type Payout = Database["public"]["Tables"]["payouts"]["Row"];
export type Reservation = Database["public"]["Tables"]["reservations"]["Row"];
export type NoticeAppeal = Database["public"]["Tables"]["notice_appeals"]["Row"];
export type Notification = Database["public"]["Tables"]["notifications"]["Row"];

export const KEYS = {
  sites: ["sites"] as const,
  sessions: ["sessions"] as const,
  myActive: ["sessions", "my-active"] as const,
  notices: ["notices"] as const,
  noticeAppeals: ["notice-appeals"] as const,
  notifications: ["notifications"] as const,
  profile: ["profile"] as const,
  payments: ["payments"] as const,
  payouts: ["payouts"] as const,
  reservations: ["reservations"] as const,
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

/** Organisation-scoped sites for operator/admin workspaces. */
export function useOperatorSites() {
  const listSites = useServerFn(listOperatorSitesFn);
  return useQuery({
    queryKey: ["operator-sites"],
    queryFn: async (): Promise<Site[]> => listSites(),
  });
}

/** All sessions visible to the caller (RLS-scoped). */
export function useSessions() {
  return useQuery({
    queryKey: KEYS.sessions,
    queryFn: async (): Promise<Session[]> => {
      const { data, error } = await supabase
        .from("sessions")
        .select("*")
        .order("started_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useNotices() {
  return useQuery({
    queryKey: KEYS.notices,
    queryFn: async (): Promise<Notice[]> => {
      const { data, error } = await supabase
        .from("notices")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useNoticeAppeals() {
  return useQuery({
    queryKey: KEYS.noticeAppeals,
    queryFn: async (): Promise<NoticeAppeal[]> => {
      const { data, error } = await supabase
        .from("notice_appeals")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useNotifications() {
  return useQuery({
    queryKey: KEYS.notifications,
    queryFn: async (): Promise<Notification[]> => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  const markRead = useServerFn(markNotificationReadFn);
  return useMutation({
    mutationFn: async (notificationId: string) =>
      markRead({ data: { notification_id: notificationId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.notifications }),
  });
}

export function useMyProfile() {
  return useQuery({
    queryKey: KEYS.profile,
    queryFn: async (): Promise<Profile | null> => {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user.id;
      if (!uid) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", uid)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      patch: Partial<Pick<Profile, "plate" | "payment_method" | "display_name">>,
    ) => {
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
  const startSession = useServerFn(startParkingSessionFn);
  return useMutation({
    mutationFn: async ({
      site,
      minutes,
      plate,
      paymentMethod,
    }: {
      site: Site;
      minutes: number;
      plate: string;
      paymentMethod: string | null;
    }) => {
      return startSession({
        data: {
          site_id: site.id,
          minutes,
          plate,
          payment_method: paymentMethod,
        },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.sessions });
      qc.invalidateQueries({ queryKey: KEYS.sites });
    },
  });
}

export function useEndSession() {
  const qc = useQueryClient();
  const endSession = useServerFn(endParkingSessionFn);
  return useMutation({
    mutationFn: async (id: string) => {
      return endSession({ data: { session_id: id } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.sessions });
      qc.invalidateQueries({ queryKey: KEYS.sites });
      qc.invalidateQueries({ queryKey: KEYS.payments });
    },
  });
}

export function useExtendSession() {
  const qc = useQueryClient();
  const extendSession = useServerFn(extendParkingSessionFn);
  return useMutation({
    mutationFn: async ({ session, minutes }: { session: Session; minutes: number }) => {
      return extendSession({ data: { session_id: session.id, minutes } });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.sessions }),
  });
}

export function useUpdateSite() {
  const qc = useQueryClient();
  const updateSite = useServerFn(updateOperatorSiteFn);
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Site> }) => {
      return updateSite({
        data: {
          id,
          price_cents_per_hour: patch.price_cents_per_hour,
          occupied: patch.occupied,
        },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.sites });
      qc.invalidateQueries({ queryKey: ["operator-sites"] });
    },
  });
}

export function useAddSite() {
  const qc = useQueryClient();
  const createSite = useServerFn(createOperatorSiteFn);
  return useMutation({
    mutationFn: async (site: SiteInsert) => {
      return createSite({
        data: {
          name: site.name,
          address: site.address,
          lat: site.lat,
          lng: site.lng,
          capacity: site.capacity,
          price_cents_per_hour: site.price_cents_per_hour,
          operator_name: site.operator_name ?? "",
          type: site.type ?? "lot",
          amenities: site.amenities ?? [],
        },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.sites });
      qc.invalidateQueries({ queryKey: ["operator-sites"] });
    },
  });
}

export function useIssueNotice() {
  const qc = useQueryClient();
  const issueNotice = useServerFn(issueParkingNoticeFn);
  return useMutation({
    mutationFn: async (n: {
      site_id: string;
      plate: string;
      reason: string;
      amount_cents: number;
      evidence?: {
        observed_at: string;
        officer_note?: string;
        photo_urls: string[];
      };
    }) => {
      return issueNotice({ data: n });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.notices }),
  });
}

export function useCreateNoticeAppeal() {
  const qc = useQueryClient();
  const createAppeal = useServerFn(createNoticeAppealFn);
  return useMutation({
    mutationFn: async (input: { notice_id: string; reason: string; details: string }) =>
      createAppeal({ data: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.notices });
      qc.invalidateQueries({ queryKey: KEYS.noticeAppeals });
    },
  });
}

export function useResolveNoticeAppeal() {
  const qc = useQueryClient();
  const resolveAppeal = useServerFn(resolveNoticeAppealFn);
  return useMutation({
    mutationFn: async (input: {
      appeal_id: string;
      decision: "accepted" | "upheld";
      response: string;
    }) => resolveAppeal({ data: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.notices });
      qc.invalidateQueries({ queryKey: KEYS.noticeAppeals });
    },
  });
}

export function useCreateNoticePayment() {
  const qc = useQueryClient();
  const createPayment = useServerFn(createNoticePaymentFn);
  return useMutation({
    mutationFn: async (noticeId: string) => createPayment({ data: { notice_id: noticeId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.payments }),
  });
}

export function useUpdateNotice() {
  const qc = useQueryClient();
  const updateNotice = useServerFn(updateParkingNoticeStatusFn);
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Notice> }) => {
      if (patch.status !== "waived" && patch.status !== "contested") {
        throw new Error("Only waived or contested can be set manually");
      }
      return updateNotice({ data: { notice_id: id, status: patch.status } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.notices });
      qc.invalidateQueries({ queryKey: KEYS.payments });
    },
  });
}

// ============ PAYMENTS ============
export function useMyPayments() {
  return useQuery({
    queryKey: KEYS.payments,
    queryFn: async (): Promise<Payment[]> => {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function usePayouts() {
  return useQuery({
    queryKey: KEYS.payouts,
    queryFn: async (): Promise<Payout[]> => {
      const { data, error } = await supabase
        .from("payouts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

// ============ RESERVATIONS ============
export function useReservations() {
  return useQuery({
    queryKey: KEYS.reservations,
    queryFn: async (): Promise<Reservation[]> => {
      const { data, error } = await supabase
        .from("reservations")
        .select("*")
        .order("starts_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateReservation() {
  const qc = useQueryClient();
  const createReservation = useServerFn(createParkingReservationFn);
  return useMutation({
    mutationFn: async ({
      site,
      plate,
      startsAt,
      minutes,
    }: {
      site: Site;
      plate: string;
      startsAt: Date;
      minutes: number;
    }) => {
      return createReservation({
        data: {
          site_id: site.id,
          plate,
          starts_at: startsAt.toISOString(),
          minutes,
        },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.reservations });
      qc.invalidateQueries({ queryKey: KEYS.payments });
    },
  });
}

export function useCancelReservation() {
  const qc = useQueryClient();
  const cancelReservation = useServerFn(cancelParkingReservationFn);
  return useMutation({
    mutationFn: async (id: string) => {
      return cancelReservation({ data: { reservation_id: id } });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.reservations }),
  });
}

/** Subscribe to realtime changes on the given tables and invalidate matching queries. */
export function useRealtimeSync(
  tables: Array<"sites" | "sessions" | "notices" | "payments" | "payouts" | "reservations">,
) {
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
