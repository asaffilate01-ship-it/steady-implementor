import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database, Json } from "@/integrations/supabase/types";

type BusinessAccount = Database["public"]["Tables"]["business_accounts"]["Row"];
type CostCentre = Database["public"]["Tables"]["cost_centres"]["Row"];
type TariffPlan = Database["public"]["Tables"]["tariff_plans"]["Row"];
type SupportCase = Database["public"]["Tables"]["support_cases"]["Row"];

function rpcResult<T>(data: Json | null, error: { message: string } | null): T {
  if (error) throw new Error(error.message);
  if (!data) throw new Error("The operation completed without returning a record");
  return data as unknown as T;
}

const createBusinessSchema = z.object({
  name: z.string().trim().min(2).max(120),
  billing_email: z.union([z.string().trim().email().max(254), z.literal("")]).optional(),
  monthly_limit_cents: z.number().int().min(0).max(100_000_000).default(0),
});

export const createBusinessAccountFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => createBusinessSchema.parse(input))
  .handler(async ({ data, context }) => {
    const result = await context.supabase.rpc("create_business_account_secure", {
      _name: data.name,
      _billing_email: data.billing_email || undefined,
      _monthly_limit_cents: data.monthly_limit_cents,
    });
    return rpcResult<BusinessAccount>(result.data, result.error);
  });

const costCentreSchema = z.object({
  account_id: z.string().uuid(),
  code: z.string().trim().min(1).max(32),
  name: z.string().trim().min(2).max(120),
  budget_cents: z.number().int().min(0).max(100_000_000).default(0),
});

export const saveBusinessCostCentreFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => costCentreSchema.parse(input))
  .handler(async ({ data, context }) => {
    const result = await context.supabase.rpc("save_business_cost_centre_secure", {
      _account_id: data.account_id,
      _code: data.code,
      _name: data.name,
      _budget_cents: data.budget_cents,
    });
    return rpcResult<CostCentre>(result.data, result.error);
  });

const tariffSchema = z.object({
  id: z.string().uuid().optional(),
  site_id: z.string().uuid(),
  name: z.string().trim().min(2).max(120).default("Standard"),
  free_minutes: z.number().int().min(0).max(1440).default(0),
  minimum_charge_cents: z.number().int().min(0).max(100_000).default(0),
  service_fee_cents: z.number().int().min(0).max(100_000).default(0),
  reservation_fee_cents: z.number().int().min(0).max(100_000).default(0),
  daily_cap_cents: z.number().int().min(0).max(100_000).nullable().default(null),
  max_stay_minutes: z.number().int().min(5).max(1440).nullable().default(null),
});

export const saveTariffPlanFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => tariffSchema.parse(input))
  .handler(async ({ data, context }) => {
    const result = await context.supabase.rpc("save_tariff_plan_secure", {
      _id: (data.id ?? null) as unknown as string,
      _site_id: data.site_id,
      _name: data.name,
      _free_minutes: data.free_minutes,
      _minimum_charge_cents: data.minimum_charge_cents,
      _service_fee_cents: data.service_fee_cents,
      _reservation_fee_cents: data.reservation_fee_cents,
      _daily_cap_cents: data.daily_cap_cents as unknown as number,
      _max_stay_minutes: data.max_stay_minutes as unknown as number,
    });
    return rpcResult<TariffPlan>(result.data, result.error);
  });

const supportCaseSchema = z.object({
  subject: z.string().trim().min(3).max(160),
  category: z.enum(["payment", "session", "notice", "account", "site", "other"]),
  body: z.string().trim().min(10).max(8000),
  reference_type: z.string().trim().max(40).optional(),
  reference_id: z.string().trim().max(200).optional(),
});

export const createSupportCaseFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => supportCaseSchema.parse(input))
  .handler(async ({ data, context }) => {
    const result = await context.supabase.rpc("create_support_case_secure", {
      _subject: data.subject,
      _category: data.category,
      _body: data.body,
      _reference_type: data.reference_type || undefined,
      _reference_id: data.reference_id || undefined,
    });
    return rpcResult<SupportCase>(result.data, result.error);
  });
