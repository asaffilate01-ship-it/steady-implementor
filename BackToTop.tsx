import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database, Json } from "@/integrations/supabase/types";

type Site = Database["public"]["Tables"]["sites"]["Row"];
type Session = Database["public"]["Tables"]["sessions"]["Row"];
type Reservation = Database["public"]["Tables"]["reservations"]["Row"];
type Notice = Database["public"]["Tables"]["notices"]["Row"];

function rpcError(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

const plateSchema = z
  .string()
  .trim()
  .min(2)
  .max(16)
  .transform((value) => value.toUpperCase());

export const listOperatorSitesFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("get_operator_sites");
    rpcError(error);
    return (data ?? []) as Site[];
  });

const createSiteSchema = z.object({
  name: z.string().trim().min(2).max(120),
  address: z.string().trim().min(4).max(240),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  capacity: z.number().int().min(1).max(100_000),
  price_cents_per_hour: z.number().int().min(0).max(100_000),
  operator_name: z.string().trim().max(120),
  type: z.enum(["street", "garage", "lot"]).default("lot"),
  amenities: z.array(z.string().trim().min(1).max(40)).max(30).default([]),
});

export const createOperatorSiteFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => createSiteSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: site, error } = await context.supabase.rpc("create_operator_site", {
      _name: data.name,
      _address: data.address,
      _lat: data.lat,
      _lng: data.lng,
      _capacity: data.capacity,
      _price_cents_per_hour: data.price_cents_per_hour,
      _operator_name: data.operator_name,
      _type: data.type,
      _amenities: data.amenities,
    });
    rpcError(error);
    return site as Site;
  });

const updateSiteSchema = z.object({
  id: z.string().uuid(),
  price_cents_per_hour: z.number().int().min(0).max(100_000).nullable().optional(),
  occupied: z.number().int().min(0).nullable().optional(),
});

export const updateOperatorSiteFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => updateSiteSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: site, error } = await context.supabase.rpc("update_operator_site", {
      _site_id: data.id,
      _price_cents_per_hour: data.price_cents_per_hour ?? null,
      _occupied: data.occupied ?? null,
    });
    rpcError(error);
    return site as Site;
  });

const startSessionSchema = z.object({
  site_id: z.string().uuid(),
  minutes: z.number().int().min(5).max(1440),
  plate: plateSchema,
  payment_method: z.string().trim().max(40).nullable().optional(),
});

export const startParkingSessionFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => startSessionSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: session, error } = await context.supabase.rpc("start_parking_session", {
      _site_id: data.site_id,
      _minutes: data.minutes,
      _plate: data.plate,
      _payment_method: data.payment_method ?? null,
    });
    rpcError(error);
    return session as Session;
  });

export const extendParkingSessionFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({ session_id: z.string().uuid(), minutes: z.number().int().min(5).max(480) })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: session, error } = await context.supabase.rpc("extend_parking_session", {
      _session_id: data.session_id,
      _minutes: data.minutes,
    });
    rpcError(error);
    return session as Session;
  });

export type EndSessionResult = {
  minutes: number;
  amount_cents: number;
  payment_id: string | null;
  payment_status: string | null;
};

export const endParkingSessionFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ session_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: result, error } = await context.supabase.rpc("end_parking_session", {
      _session_id: data.session_id,
    });
    rpcError(error);
    return result as Json as EndSessionResult;
  });

const reservationSchema = z.object({
  site_id: z.string().uuid(),
  plate: plateSchema,
  starts_at: z.string().datetime(),
  minutes: z.number().int().min(15).max(1440),
});

export const createParkingReservationFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => reservationSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: reservation, error } = await context.supabase.rpc("create_parking_reservation", {
      _site_id: data.site_id,
      _plate: data.plate,
      _starts_at: data.starts_at,
      _minutes: data.minutes,
    });
    rpcError(error);
    return reservation as Reservation;
  });

export const cancelParkingReservationFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ reservation_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: reservation, error } = await context.supabase.rpc("cancel_parking_reservation", {
      _reservation_id: data.reservation_id,
    });
    rpcError(error);
    return reservation as Reservation;
  });

const noticeSchema = z.object({
  site_id: z.string().uuid(),
  plate: plateSchema,
  reason: z.string().trim().min(3).max(240),
  amount_cents: z.number().int().min(0).max(100_000),
});

export const checkParkingSessionFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z.object({ site_id: z.string().uuid(), plate: plateSchema }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: result, error } = await context.supabase.rpc("check_parking_session", {
      _site_id: data.site_id,
      _plate: data.plate,
    });
    rpcError(error);
    const checked = result as Json as {
      status: "valid" | "invalid";
      session_id?: string;
      ends_at?: string;
    };
    return checked.status === "valid"
      ? { status: "valid" as const, sessionId: checked.session_id!, endsAt: checked.ends_at! }
      : { status: "invalid" as const };
  });

export const issueParkingNoticeFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => noticeSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: notice, error } = await context.supabase.rpc("issue_parking_notice", {
      _site_id: data.site_id,
      _plate: data.plate,
      _reason: data.reason,
      _amount_cents: data.amount_cents,
    });
    rpcError(error);
    return notice as Notice;
  });

export const updateParkingNoticeStatusFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({ notice_id: z.string().uuid(), status: z.enum(["waived", "contested"]) })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: notice, error } = await context.supabase.rpc("update_parking_notice_status", {
      _notice_id: data.notice_id,
      _status: data.status,
    });
    rpcError(error);
    return notice as Notice;
  });
