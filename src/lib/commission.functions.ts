import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertAdmin(context: { supabase: import("@supabase/supabase-js").SupabaseClient; userId: string }) {
  const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!data) throw new Error("Forbidden");
}

const updateOrgCommissionSchema = z.object({
  org_id: z.string().uuid(),
  platform_fee_bps: z.number().int().min(0).max(10000),
  platform_fixed_fee_cents: z.number().int().min(0),
});

export const updateOrgCommissionFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => updateOrgCommissionSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("orgs")
      .update({ platform_fee_bps: data.platform_fee_bps, platform_fixed_fee_cents: data.platform_fixed_fee_cents })
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
  .inputValidator((input: unknown) => updateProviderCommissionSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("providers")
      .update({ platform_fee_bps: data.platform_fee_bps, platform_fixed_fee_cents: data.platform_fixed_fee_cents })
      .eq("id", data.provider_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
