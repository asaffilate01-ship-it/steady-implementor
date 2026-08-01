import { describe, expect, it } from "vitest";
import { transitionForStripeEvent } from "./payment-domain";

describe("transitionForStripeEvent", () => {
  it("makes only successful payment intents settlement eligible", () => {
    expect(transitionForStripeEvent("payment_intent.succeeded")).toEqual({
      status: "paid",
      payoutStatus: "eligible",
    });
    expect(transitionForStripeEvent("payment_intent.payment_failed")).toEqual({
      status: "failed",
      payoutStatus: "held",
    });
  });

  it("holds partial refunds and closes fully refunded payments", () => {
    expect(transitionForStripeEvent("charge.refunded", { fullyRefunded: false })).toEqual({
      status: "paid",
      payoutStatus: "held",
    });
    expect(transitionForStripeEvent("charge.refunded", { fullyRefunded: true })).toEqual({
      status: "refunded",
      payoutStatus: "held",
    });
  });

  it("only releases a closed dispute when the merchant won", () => {
    expect(transitionForStripeEvent("charge.dispute.closed", { disputeOutcome: "won" })).toEqual({
      status: "paid",
      payoutStatus: "eligible",
    });
    expect(transitionForStripeEvent("charge.dispute.closed", { disputeOutcome: "lost" })).toEqual({
      status: "disputed",
      payoutStatus: "held",
    });
  });

  it("ignores events without explicit financial semantics", () => {
    expect(transitionForStripeEvent("customer.updated")).toBeNull();
  });
});
