import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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

export const createPaymentIntentFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ payment_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const [{ supabaseAdmin }, { getStripe, getStripePublishableKey }] = await Promise.all([
      import("@/integrations/supabase/client.server"),
      import("@/lib/payments.server"),
    ]);
    const { data: payment, error } = await supabaseAdmin
      .from("payments")
      .select("*")
      .eq("id", data.payment_id)
      .eq("driver_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!payment) throw new Error("Payment not found");
    if (!["pending", "failed"].includes(payment.status)) {
      throw new Error("Payment is not payable");
    }
    if (payment.amount_cents < 50) throw new Error("Payment amount is below the processor minimum");

    const stripe = getStripe();
    let intent;
    if (payment.provider === "stripe" && payment.provider_payment_id) {
      intent = await stripe.paymentIntents.retrieve(payment.provider_payment_id);
    } else {
      intent = await stripe.paymentIntents.create(
        {
          amount: payment.amount_cents,
          currency: payment.currency.toLowerCase(),
          automatic_payment_methods: { enabled: true },
          description: payment.description ?? "ParkPunkt parking payment",
          metadata: {
            payment_id: payment.id,
            driver_id: context.userId,
            source: payment.notice_id
              ? "notice"
              : payment.reservation_id
                ? "reservation"
                : "session",
          },
        },
        { idempotencyKey: `payment-intent:${payment.id}` },
      );
      const { error: updateError } = await supabaseAdmin
        .from("payments")
        .update({
          provider: "stripe",
          provider_payment_id: intent.id,
          external_ref: intent.id,
          method: "card",
          failure_code: null,
          failure_message: null,
        })
        .eq("id", payment.id);
      if (updateError) throw new Error(updateError.message);
      await supabaseAdmin.from("audit_events").insert({
        actor_user_id: context.userId,
        action: "payment.intent_created",
        entity_type: "payment",
        entity_id: payment.id,
        metadata: { provider: "stripe", provider_payment_id: intent.id },
      });
    }

    if (!intent.client_secret) throw new Error("Payment provider did not return a client secret");
    return {
      paymentId: payment.id,
      clientSecret: intent.client_secret,
      publishableKey: getStripePublishableKey(),
    };
  });

export const refundPaymentFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        payment_id: z.string().uuid(),
        amount_cents: z.number().int().positive().optional(),
        reason: z
          .enum(["duplicate", "fraudulent", "requested_by_customer"])
          .default("requested_by_customer"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const [{ supabaseAdmin }, { getStripe }] = await Promise.all([
      import("@/integrations/supabase/client.server"),
      import("@/lib/payments.server"),
    ]);
    const { data: payment, error } = await supabaseAdmin
      .from("payments")
      .select("*")
      .eq("id", data.payment_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!payment?.provider_payment_id || payment.provider !== "stripe") {
      throw new Error("Payment has no refundable Stripe transaction");
    }
    if (!["paid", "disputed"].includes(payment.status))
      throw new Error("Payment is not refundable");
    const remaining = payment.amount_cents - payment.refunded_cents;
    const amount = data.amount_cents ?? remaining;
    if (amount > remaining) throw new Error("Refund exceeds the unrefunded amount");

    const targetRefunded = payment.refunded_cents + amount;
    const refund = await getStripe().refunds.create(
      {
        payment_intent: payment.provider_payment_id,
        amount,
        reason: data.reason,
        metadata: { payment_id: payment.id, requested_by: context.userId },
      },
      { idempotencyKey: `refund:${payment.id}:${targetRefunded}` },
    );
    await supabaseAdmin.from("audit_events").insert({
      actor_user_id: context.userId,
      action: "payment.refund_requested",
      entity_type: "payment",
      entity_id: payment.id,
      metadata: { provider: "stripe", refund_id: refund.id, amount_cents: amount },
    });
    return { id: refund.id, status: refund.status, amount: refund.amount };
  });
