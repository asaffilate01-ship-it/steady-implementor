export type PaymentTransition = {
  status: "authorized" | "paid" | "failed" | "cancelled" | "refunded" | "disputed";
  payoutStatus: "eligible" | "held";
};

/**
 * Keeps provider event semantics in one testable place. Unknown events are
 * ignored so adding a Stripe event to the webhook subscription cannot mutate
 * money accidentally.
 */
export function transitionForStripeEvent(
  eventType: string,
  details: { disputeOutcome?: string; fullyRefunded?: boolean } = {},
): PaymentTransition | null {
  switch (eventType) {
    case "payment_intent.processing":
      return { status: "authorized", payoutStatus: "held" };
    case "payment_intent.succeeded":
      return { status: "paid", payoutStatus: "eligible" };
    case "payment_intent.payment_failed":
      return { status: "failed", payoutStatus: "held" };
    case "payment_intent.canceled":
      return { status: "cancelled", payoutStatus: "held" };
    case "charge.refunded":
      return details.fullyRefunded
        ? { status: "refunded", payoutStatus: "held" }
        : { status: "paid", payoutStatus: "held" };
    case "charge.dispute.created":
      return { status: "disputed", payoutStatus: "held" };
    case "charge.dispute.closed":
      return details.disputeOutcome === "won"
        ? { status: "paid", payoutStatus: "eligible" }
        : { status: "disputed", payoutStatus: "held" };
    default:
      return null;
  }
}
