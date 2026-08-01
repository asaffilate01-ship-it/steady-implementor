import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// --- helpers (server-only) --------------------------------------------------
async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
function generateRawKey(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `pk_${hex}`;
}
async function assertRole(
  context: { supabase: import("@supabase/supabase-js").SupabaseClient; userId: string },
  role: "admin" | "provider",
) {
  const { data } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: role,
  });
  if (!data) throw new Error("Forbidden");
}

// --- create api key (provider or admin) -------------------------------------
export const createApiKeyFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { name: string; provider_id?: string | null }) =>
    z
      .object({
        name: z.string().trim().min(1).max(80),
        provider_id: z.string().uuid().nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    // must be provider or admin
    const [{ data: isProv }, { data: isAdmin }] = await Promise.all([
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "provider" }),
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
    ]);
    if (!isProv && !isAdmin) throw new Error("Forbidden");
    if (!isAdmin && data.provider_id) throw new Error("Only an admin can assign a provider ID");

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
  .validator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const [{ data: isProvider }, { data: isAdmin }] = await Promise.all([
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "provider" }),
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
    ]);
    if (!isProvider && !isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: key, error: keyError } = await supabaseAdmin
      .from("api_keys")
      .select("owner_user_id")
      .eq("id", data.id)
      .single();
    if (keyError || !key) throw new Error("API key not found");
    if (!isAdmin && key.owner_user_id !== context.userId) throw new Error("Forbidden");
    const { error } = await supabaseAdmin
      .from("api_keys")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// --- sync one provider -------------------------------------------------------
export const syncProviderFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { provider_id: string }) => z.object({ provider_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertRole(context, "admin");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: prov, error: pErr } = await supabaseAdmin
      .from("providers")
      .select("*")
      .eq("id", data.provider_id)
      .single();
    if (pErr || !prov) throw new Error(pErr?.message ?? "Provider not found");
    const { runProviderSync } = await import("@/lib/provider-sync.server");
    return runProviderSync(prov, context.userId);
  });

// --- upsert / delete provider (admin only) ----------------------------------
export const upsertProviderFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (d: {
      id?: string;
      name: string;
      slug: string;
      kind: string;
      country?: string;
      api_base_url?: string | null;
      auth_type?: string;
      status?: string;
      notes?: string | null;
    }) =>
      z
        .object({
          id: z.string().uuid().optional(),
          name: z.string().min(1).max(80),
          slug: z
            .string()
            .min(1)
            .max(60)
            .regex(/^[a-z0-9-]+$/),
          kind: z.enum(["operator", "municipal", "datex", "handyparken", "other"]),
          country: z.string().length(2).optional(),
          api_base_url: z.string().url().nullable().optional(),
          auth_type: z.enum(["none", "api_key", "oauth2", "basic"]).optional(),
          status: z.enum(["active", "paused", "onboarding"]).optional(),
          notes: z.string().max(500).nullable().optional(),
        })
        .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertRole(context, "admin");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("providers").upsert({
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
  .validator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertRole(context, "admin");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("providers").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
