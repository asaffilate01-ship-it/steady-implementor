import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// --- helpers (server-only) --------------------------------------------------
async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function generateRawKey(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
  return `pk_${hex}`;
}
async function assertRole(context: { supabase: import("@supabase/supabase-js").SupabaseClient; userId: string }, role: "admin" | "provider") {
  const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: role });
  if (!data) throw new Error("Forbidden");
}

// --- create api key (provider or admin) -------------------------------------
export const createApiKeyFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { name: string; provider_id?: string | null }) =>
    z.object({ name: z.string().trim().min(1).max(80), provider_id: z.string().uuid().nullable().optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    // must be provider or admin
    const [{ data: isProv }, { data: isAdmin }] = await Promise.all([
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "provider" }),
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
    ]);
    if (!isProv && !isAdmin) throw new Error("Forbidden");

    const raw = generateRawKey();
    const key_hash = await sha256Hex(raw);
    const key_prefix = raw.slice(0, 11); // "pk_" + 8 hex
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("api_keys")
      .insert({
        owner_user_id: context.userId,
        provider_id: data.provider_id ?? null,
        name: data.name,
        key_hash,
        key_prefix,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { key: raw, id: row.id, key_prefix, name: row.name };
  });

export const revokeApiKeyFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("api_keys")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// --- sync one provider -------------------------------------------------------
export const syncProviderFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { provider_id: string }) => z.object({ provider_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertRole(context, "admin");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: prov, error: pErr } = await supabaseAdmin.from("providers").select("*").eq("id", data.provider_id).single();
    if (pErr || !prov) throw new Error(pErr?.message ?? "Provider not found");

    const { getAdapter } = await import("@/lib/providers/adapters");
    const adapter = getAdapter(prov.slug);
    if (!adapter) throw new Error(`No adapter for slug "${prov.slug}"`);

    const upstream = await adapter.listSites();
    let created = 0, updated = 0;
    for (const u of upstream) {
      const normalizedType: "street" | "garage" | "lot" =
        u.type === "on-street" || u.type === "street" ? "street"
        : u.type === "lot" ? "lot" : "garage";
      const address = u.address ?? u.name;
      // upsert site by (provider_id, external_site_id)
      const { data: existingMap } = await supabaseAdmin
        .from("site_provider_mapping")
        .select("site_id")
        .eq("provider_id", prov.id)
        .eq("external_site_id", u.external_id)
        .maybeSingle();

      if (existingMap?.site_id) {
        await supabaseAdmin.from("sites").update({
          name: u.name, address, lat: u.lat, lng: u.lng,
          capacity: u.capacity, occupied: u.occupied ?? 0,
          price_cents_per_hour: u.price_cents_per_hour, type: normalizedType, operator_name: u.operator_name,
        }).eq("id", existingMap.site_id);
        await supabaseAdmin.from("site_provider_mapping")
          .update({ last_synced_at: new Date().toISOString() })
          .eq("provider_id", prov.id).eq("external_site_id", u.external_id);
        updated++;
      } else {
        const { data: newSite, error: sErr } = await supabaseAdmin.from("sites").insert({
          name: u.name, address, lat: u.lat, lng: u.lng,
          capacity: u.capacity, occupied: u.occupied ?? 0,
          price_cents_per_hour: u.price_cents_per_hour, type: normalizedType, operator_name: u.operator_name,
        }).select().single();
        if (sErr || !newSite) continue;
        await supabaseAdmin.from("site_provider_mapping").insert({
          site_id: newSite.id, provider_id: prov.id, external_site_id: u.external_id,
          last_synced_at: new Date().toISOString(),
        });
        created++;
      }
    }

    await supabaseAdmin.from("providers").update({ status: "active" }).eq("id", prov.id);
    return { provider: prov.slug, created, updated, total: upstream.length };
  });

// --- upsert / delete provider (admin only) ----------------------------------
export const upsertProviderFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    id?: string; name: string; slug: string; kind: string; country?: string;
    api_base_url?: string | null; auth_type?: string; status?: string; notes?: string | null;
  }) => z.object({
    id: z.string().uuid().optional(),
    name: z.string().min(1).max(80),
    slug: z.string().min(1).max(60).regex(/^[a-z0-9-]+$/),
    kind: z.enum(["operator","municipal","datex","handyparken","other"]),
    country: z.string().length(2).optional(),
    api_base_url: z.string().url().nullable().optional(),
    auth_type: z.enum(["none","api_key","oauth2","basic"]).optional(),
    status: z.enum(["active","paused","onboarding"]).optional(),
    notes: z.string().max(500).nullable().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertRole(context, "admin");
    const { error } = await context.supabase.from("providers").upsert({
      id: data.id,
      name: data.name,
      slug: data.slug,
      kind: data.kind as "operator",
      country: data.country ?? "DE",
      api_base_url: data.api_base_url ?? null,
      auth_type: (data.auth_type ?? "none") as "none",
      status: (data.status ?? "onboarding") as "onboarding",
      notes: data.notes ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteProviderFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertRole(context, "admin");
    const { error } = await context.supabase.from("providers").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });