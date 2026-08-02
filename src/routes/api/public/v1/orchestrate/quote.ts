import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { filterAndRankQuotes } from "@/lib/parking-domain";

const inputSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  duration_minutes: z
    .number()
    .int()
    .min(5)
    .max(24 * 60)
    .default(60),
  radius_m: z.number().int().min(50).max(50_000).default(5_000),
  max_results: z.number().int().min(1).max(50).default(10),
});

const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "authorization, content-type, apikey",
  "content-type": "application/json",
};

const RATE_LIMIT_PER_MIN = 60;

async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export const Route = createFileRoute("/api/public/v1/orchestrate/quote")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS_HEADERS }),
      POST: async ({ request }) => {
        const started = Date.now();
        const authHeader = request.headers.get("authorization") ?? "";
        const bearer = authHeader.toLowerCase().startsWith("bearer ")
          ? authHeader.slice(7).trim()
          : "";
        if (!bearer.startsWith("pk_")) {
          return json(
            { error: "Missing or invalid Bearer token. Expected 'Authorization: Bearer pk_…'." },
            401,
          );
        }

        // Load admin client to look up the key (RLS-bypass; we only reveal safe fields).
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const key_hash = await sha256Hex(bearer);
        const { data: keyRow } = await supabaseAdmin
          .from("api_keys")
          .select("id, revoked_at, scopes")
          .eq("key_hash", key_hash)
          .maybeSingle();
        if (!keyRow || keyRow.revoked_at) {
          await logRequest(null, "/api/public/v1/orchestrate/quote", 401, Date.now() - started);
          return json({ error: "Invalid or revoked API key." }, 401);
        }
        if (!(keyRow.scopes ?? []).includes("orchestrate:quote")) {
          await logRequest(
            keyRow.id,
            "/api/public/v1/orchestrate/quote",
            403,
            Date.now() - started,
          );
          return json({ error: "Key lacks scope 'orchestrate:quote'." }, 403);
        }

        // Atomic fixed-window limiter; concurrent calls cannot bypass it.
        const { data: allowed, error: rateLimitError } = await supabaseAdmin.rpc(
          "consume_api_rate_limit",
          {
            _api_key_id: keyRow.id,
            _request_limit: RATE_LIMIT_PER_MIN,
            _window_seconds: 60,
          },
        );
        if (rateLimitError) {
          await logRequest(
            keyRow.id,
            "/api/public/v1/orchestrate/quote",
            500,
            Date.now() - started,
          );
          return json({ error: "Rate limiter unavailable." }, 500);
        }
        if (!allowed) {
          await logRequest(
            keyRow.id,
            "/api/public/v1/orchestrate/quote",
            429,
            Date.now() - started,
          );
          return json({ error: "Rate limit exceeded (60/min)." }, 429);
        }

        // Parse & validate body
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          body = {};
        }
        const parsed = inputSchema.safeParse(body);
        if (!parsed.success) {
          await logRequest(
            keyRow.id,
            "/api/public/v1/orchestrate/quote",
            400,
            Date.now() - started,
          );
          return json({ error: "Invalid input", details: parsed.error.flatten() }, 400);
        }
        const q = parsed.data;

        // Load candidate sites (all — dataset is small; filter in JS)
        const { data: sites, error } = await supabaseAdmin
          .from("sites")
          .select(
            "id, name, address, lat, lng, capacity, occupied, price_cents_per_hour, type, operator_name",
          )
          .eq("is_public", true);
        if (error) {
          await logRequest(
            keyRow.id,
            "/api/public/v1/orchestrate/quote",
            500,
            Date.now() - started,
          );
          return json({ error: error.message }, 500);
        }

        let candidates;
        try {
          candidates = await Promise.all(
            (sites ?? []).map(async (s) => {
              const distance_km = haversineKm(
                { lat: q.lat, lng: q.lng },
                { lat: s.lat, lng: s.lng },
              );
              const tariff = await calculateTariffQuote(supabaseAdmin, s.id, q.duration_minutes);
              const split = await calculateFeeSplit(supabaseAdmin, s.id, tariff.total_cents);
              return {
                site_id: s.id,
                name: s.name,
                address: s.address,
                operator: s.operator_name,
                type: s.type,
                distance_m: Math.round(distance_km * 1000),
                available: Math.max(0, s.capacity - s.occupied),
                capacity: s.capacity,
                quote: {
                  amount_cents: tariff.total_cents,
                  parking_cents: tariff.parking_cents,
                  service_fee_cents: tariff.service_fee_cents,
                  chargeable_minutes: tariff.chargeable_minutes,
                  free_minutes: tariff.free_minutes,
                  capped_by_daily_cap: tariff.capped_by_daily_cap,
                  price_cents_per_hour: s.price_cents_per_hour,
                  currency: "EUR",
                  platform_fee_cents: split.platform_fee_cents,
                  operator_net_cents: split.operator_net_cents,
                },
              };
            }),
          );
        } catch (cause) {
          console.error("[orchestrate.quote] tariff calculation failed", (cause as Error).message);
          await logRequest(
            keyRow.id,
            "/api/public/v1/orchestrate/quote",
            503,
            Date.now() - started,
          );
          return json({ error: "Tariff service unavailable." }, 503);
        }

        const sorted = filterAndRankQuotes(candidates, q.radius_m, q.max_results);

        // Update last_used_at + log
        await supabaseAdmin
          .from("api_keys")
          .update({ last_used_at: new Date().toISOString() })
          .eq("id", keyRow.id);
        await logRequest(keyRow.id, "/api/public/v1/orchestrate/quote", 200, Date.now() - started);

        return json({ query: q, count: sorted.length, results: sorted });
      },
    },
  },
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: CORS_HEADERS });
}

async function calculateFeeSplit(
  admin: SupabaseClient<Database>,
  site_id: string,
  amount_cents: number,
): Promise<{ platform_fee_cents: number; operator_net_cents: number }> {
  const { data, error } = await admin
    .rpc("calculate_platform_fee", {
      _site_id: site_id,
      _amount_cents: amount_cents,
      _org_id: null as unknown as string,
      _provider_id: null as unknown as string,
    })
    .single();
  if (error) throw new Error(`Fee configuration unavailable: ${error.message}`);
  if (
    !data ||
    typeof data.platform_fee_cents !== "number" ||
    typeof data.operator_net_cents !== "number" ||
    data.platform_fee_cents < 0 ||
    data.operator_net_cents < 0 ||
    data.platform_fee_cents + data.operator_net_cents !== amount_cents
  ) {
    throw new Error("Fee configuration returned an invalid settlement split");
  }
  return {
    platform_fee_cents: data.platform_fee_cents,
    operator_net_cents: data.operator_net_cents,
  };
}

async function calculateTariffQuote(
  admin: SupabaseClient<Database>,
  site_id: string,
  minutes: number,
) {
  const { data, error } = await admin.rpc("quote_parking_tariff", {
    _site_id: site_id,
    _minutes: minutes,
    _reservation: false,
  });
  if (error || !data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error(error?.message ?? "Invalid tariff response");
  }
  const quote = data as Record<string, unknown>;
  const number = (key: string) => {
    const value = quote[key];
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new Error(`Tariff response omitted ${key}`);
    }
    return value;
  };
  return {
    total_cents: number("total_cents"),
    parking_cents: number("parking_cents"),
    service_fee_cents: number("service_fee_cents"),
    chargeable_minutes: number("chargeable_minutes"),
    free_minutes: typeof quote.free_minutes === "number" ? quote.free_minutes : 0,
    capped_by_daily_cap: quote.capped_by_daily_cap === true,
  };
}

async function logRequest(
  api_key_id: string | null,
  path: string,
  status: number,
  latency_ms: number,
) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("api_request_log").insert({ api_key_id, path, status, latency_ms });
  } catch {
    /* best-effort */
  }
}
