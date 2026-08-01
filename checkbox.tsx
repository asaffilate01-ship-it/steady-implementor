import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

export type Org = Database["public"]["Tables"]["orgs"]["Row"];

async function assertAdmin(context: {
  supabase: import("@supabase/supabase-js").SupabaseClient;
  userId: string;
}) {
  const { data } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!data) throw new Error("Forbidden");
}

export const listOrgsFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.from("orgs").select("*").order("name");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createOrgFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({ name: z.string().trim().min(2).max(120), kind: z.enum(["operator", "provider"]) })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: org, error } = await supabaseAdmin.from("orgs").insert(data).select().single();
    if (error) throw new Error(error.message);
    return org;
  });

const updateOrgCommissionSchema = z.object({
  org_id: z.string().uuid(),
  platform_fee_bps: z.number().int().min(0).max(10000),
  platform_fixed_fee_cents: z.number().int().min(0),
});

export const updateOrgCommissionFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => updateOrgCommissionSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("orgs")
      .update({
        platform_fee_bps: data.platform_fee_bps,
        platform_fixed_fee_cents: data.platform_fixed_fee_cents,
      })
      .eq("id", data.org_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const updateProviderCommissionSchema = z.object({
  provider_id: z.string().uuid(),
  platform_fee_bps: z.number().int().min(0).max(10000),
  platform_fixed_fee_cents: z.number().int().min(0),
});

export const updateProviderCommissionFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => updateProviderCommissionSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("providers")
      .update({
        platform_fee_bps: data.platform_fee_bps,
        platform_fixed_fee_cents: data.platform_fixed_fee_cents,
      })
      .eq("id", data.provider_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
