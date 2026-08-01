import Stripe from "stripe";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Database } from "@/integrations/supabase/types";
import { transitionForStripeEvent } from "@/lib/payment-domain";

let stripeClient: Stripe | undefined;

export function getStripe(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error("Payments are not configured: STRIPE_SECRET_KEY is missing");
  stripeClient ??= new Stripe(secretKey, {
    httpClient: Stripe.createFetchHttpClient(),
  });
  return stripeClient;
}

export function getStripePublishableKey(): string {
  const key = process.env.STRIPE_PUBLISHABLE_KEY;
  if (!key) throw new Error("Payments are not configured: STRIPE_PUBLISHABLE_KEY is missing");
  return key;
}

export async function constructStripeEvent(body: string, signature: string): Promise<Stripe.Event> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("Payments are not configured: STRIPE_WEBHOOK_SECRET is missing");
  return getStripe().webhooks.constructEventAsync(
    body,
    signature,
    secret,
    undefined,
    Stripe.createSubtleCryptoProvider(),
  );
}

type PaymentRow = {
  id: string;
  driver_id: string;
  notice_id: string | null;
  amount_cents: number;
  refunded_cents: number;
  status: string;
};

function objectId(value: string | { id: string } | null): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

async function findPayment(event: Stripe.Event): Promise<PaymentRow | null> {
  const object = event.data.object;
  let paymentId: string | undefined;
  let paymentIntentId: string | null = null;

  if (object.object === "payment_intent") {
    paymentId = object.metadata?.payment_id;
    paymentIntentId = object.id;
  } else if (object.object === "charge") {
    paymentId = object.metadata?.payment_id;
    paymentIntentId = objectId(object.payment_intent);
  } else if (object.object === "dispute") {
    paymentIntentId = objectId(object.payment_intent);
  }

  let query = supabaseAdmin
    .from("payments")
    .select("id, driver_id, notice_id, amount_cents, refunded_cents, status");
  if (paymentId) query = query.eq("id", paymentId);
  else if (paymentIntentId) query = query.eq("provider_payment_id", paymentIntentId);
  else return null;

  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(error.message);
  return data as PaymentRow | null;
}

function eventDetails(event: Stripe.Event, payment: PaymentRow) {
  const object = event.data.object;
  if (object.object === "charge") {
    return {
      fullyRefunded: object.amount_refunded >= payment.amount_cents,
      refundedCents: object.amount_refunded,
      chargeId: object.id,
    };
  }
  if (object.object === "dispute") {
    return {
      disputeOutcome: object.status,
      chargeId: objectId(object.charge),
    };
  }
  if (object.object === "payment_intent") {
    return {
      chargeId: objectId(object.latest_charge),
      failureCode: object.last_payment_error?.code ?? null,
      failureMessage: object.last_payment_error?.message ?? null,
    };
  }
  return {};
}

/** Process an already signature-verified Stripe event exactly once. */
export async function processStripeEvent(event: Stripe.Event): Promise<"processed" | "ignored"> {
  const payment = await findPayment(event);
  if (!payment) return "ignored";

  const details = eventDetails(event, payment);
  const transition = transitionForStripeEvent(event.type, details);
  if (!transition) return "ignored";

  const update: Database["public"]["Tables"]["payments"]["Update"] = {
    status: transition.status,
    payout_status: transition.payoutStatus,
    provider: "stripe",
    failure_code: "failureCode" in details ? details.failureCode : null,
    failure_message: "failureMessage" in details ? details.failureMessage : null,
  };
  if ("chargeId" in details && details.chargeId) update.provider_charge_id = details.chargeId;
  if ("refundedCents" in details) update.refunded_cents = details.refundedCents;
  if (event.type === "payment_intent.succeeded" && payment.status !== "paid") {
    update.paid_at = new Date().toISOString();
  }

  const { error } = await supabaseAdmin.from("payments").update(update).eq("id", payment.id);
  if (error) throw new Error(error.message);

  if (payment.notice_id && transition.status === "paid") {
    const { error: noticeError } = await supabaseAdmin
      .from("notices")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", payment.notice_id);
    if (noticeError) throw new Error(noticeError.message);
  } else if (payment.notice_id && transition.status === "disputed") {
    const { error: noticeError } = await supabaseAdmin
      .from("notices")
      .update({ status: "contested" })
      .eq("id", payment.notice_id);
    if (noticeError) throw new Error(noticeError.message);
  }

  const title =
    transition.status === "paid"
      ? "Payment received"
      : transition.status === "refunded"
        ? "Payment refunded"
        : transition.status === "failed"
          ? "Payment failed"
          : transition.status === "disputed"
            ? "Payment disputed"
            : "Payment updated";
  await Promise.all([
    supabaseAdmin.from("notifications").insert({
      user_id: payment.driver_id,
      type: `payment_${transition.status}`,
      title,
      body: `Your payment status is now ${transition.status}.`,
      action_url: "/drive",
      metadata: { payment_id: payment.id },
    }),
    supabaseAdmin.from("audit_events").insert({
      actor_user_id: null,
      action: `payment.${transition.status}`,
      entity_type: "payment",
      entity_id: payment.id,
      metadata: { provider: "stripe", event_id: event.id, event_type: event.type },
    }),
  ]);
  return "processed";
}
