import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { buildLaunchReadiness } from "@/lib/operations-domain";

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

export const getOperationsOverviewFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [payments, providers, webhookFailures, appeals, notificationFailures, audits] =
      await Promise.all([
        supabaseAdmin
          .from("payments")
          .select("id, amount_cents, status, payout_status, refunded_cents, created_at")
          .order("created_at", { ascending: false })
          .limit(1000),
        supabaseAdmin
          .from("providers")
          .select(
            "id, name, slug, status, last_sync_status, last_sync_completed_at, last_sync_error, last_sync_created, last_sync_updated",
          )
          .order("name"),
        supabaseAdmin
          .from("payment_webhook_events")
          .select("id, event_type, error_message, received_at", { count: "exact" })
          .eq("status", "failed")
          .order("received_at", { ascending: false })
          .limit(20),
        supabaseAdmin
          .from("notice_appeals")
          .select("id", { count: "exact", head: true })
          .in("status", ["submitted", "reviewing"]),
        supabaseAdmin
          .from("notification_deliveries")
          .select("id", { count: "exact", head: true })
          .eq("status", "dead_letter"),
        supabaseAdmin
          .from("audit_events")
          .select("id, action, entity_type, entity_id, metadata, created_at")
          .order("created_at", { ascending: false })
          .limit(30),
      ]);
    for (const result of [
      payments,
      providers,
      webhookFailures,
      appeals,
      notificationFailures,
      audits,
    ]) {
      if (result.error) throw new Error(result.error.message);
    }

    const paymentSummary = (payments.data ?? []).reduce<
      Record<string, { count: number; cents: number }>
    >((summary, payment) => {
      summary[payment.status] ??= { count: 0, cents: 0 };
      summary[payment.status].count += 1;
      summary[payment.status].cents += payment.amount_cents;
      return summary;
    }, {});
    return {
      readiness: buildLaunchReadiness(process.env),
      paymentSummary,
      providers: providers.data ?? [],
      failedWebhookCount: webhookFailures.count ?? 0,
      failedWebhooks: webhookFailures.data ?? [],
      pendingAppealCount: appeals.count ?? 0,
      deadLetterNotificationCount: notificationFailures.count ?? 0,
      audits: audits.data ?? [],
      generatedAt: new Date().toISOString(),
    };
  });

export const createSettlementBatchFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z.object({ period_start: z.string().date(), period_end: z.string().date() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: payouts, error } = await supabaseAdmin.rpc("create_settlement_batch", {
      _period_start: data.period_start,
      _period_end: data.period_end,
    });
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("audit_events").insert({
      actor_user_id: context.userId,
      action: "settlement.batch_created",
      entity_type: "settlement_period",
      entity_id: `${data.period_start}:${data.period_end}`,
      metadata: { payout_count: payouts?.length ?? 0 },
    });
    return payouts ?? [];
  });

export const markPayoutPaidFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({ payout_id: z.string().uuid(), payout_ref: z.string().trim().min(3).max(200) })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: payout, error } = await supabaseAdmin.rpc("mark_payout_paid", {
      _payout_id: data.payout_id,
      _payout_ref: data.payout_ref,
    });
    if (error) throw new Error(error.message);
    const { data: items, error: itemError } = await supabaseAdmin
      .from("settlement_items")
      .select("payment_id")
      .eq("payout_id", payout.id);
    if (itemError) throw new Error(itemError.message);
    const paymentIds = (items ?? []).map((item) => item.payment_id);
    await supabaseAdmin.from("audit_events").insert({
      actor_user_id: context.userId,
      org_id: payout.org_id,
      action: "payout.marked_paid",
      entity_type: "payout",
      entity_id: payout.id,
      metadata: { payout_ref: data.payout_ref, payment_count: paymentIds.length },
    });
    return payout;
  });
