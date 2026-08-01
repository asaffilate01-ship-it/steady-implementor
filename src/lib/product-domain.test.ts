import { describe, expect, it } from "vitest";
import {
  buildAccessPassCode,
  computeTariffQuote,
  isValidPlate,
  normalizeEuropeanPlate,
  withinSpendLimit,
} from "./product-domain";

describe("computeTariffQuote", () => {
  it("applies free minutes, minimum charge and service fee", () => {
    const q = computeTariffQuote(
      { price_cents_per_hour: 240, free_minutes: 15, minimum_charge_cents: 100, service_fee_cents: 29 },
      30,
    );
    expect(q.chargeableMinutes).toBe(15);
    expect(q.parkingCents).toBe(100);
    expect(q.totalCents).toBe(129);
  });

  it("charges nothing inside the free period", () => {
    const q = computeTariffQuote({ price_cents_per_hour: 300, free_minutes: 30, service_fee_cents: 29 }, 20);
    expect(q.totalCents).toBe(0);
  });

  it("applies the daily cap and flags long stays", () => {
    const q = computeTariffQuote(
      { price_cents_per_hour: 300, daily_cap_cents: 1200, max_stay_minutes: 480 },
      600,
    );
    expect(q.parkingCents).toBe(1200);
    expect(q.cappedByDailyCap).toBe(true);
    expect(q.exceedsMaxStay).toBe(true);
  });

  it("adds the reservation fee only for reservations", () => {
    const tariff = { price_cents_per_hour: 200, reservation_fee_cents: 49 };
    expect(computeTariffQuote(tariff, 60).totalCents).toBe(200);
    expect(computeTariffQuote(tariff, 60, { reservation: true }).totalCents).toBe(249);
  });
});

describe("plate helpers", () => {
  it("normalises European plates", () => {
    expect(normalizeEuropeanPlate(" b-pp   1234 ")).toBe("B-PP 1234");
  });
  it("rejects impossible plates", () => {
    expect(isValidPlate("x")).toBe(false);
    expect(isValidPlate("B-PP 1234")).toBe(true);
  });
});

describe("access passes and spend limits", () => {
  it("produces a stable formatted code", () => {
    const code = buildAccessPassCode("session-1");
    expect(code).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    expect(buildAccessPassCode("session-1")).toBe(code);
  });
  it("treats a zero limit as unlimited", () => {
    expect(withinSpendLimit({ spentCents: 900, limitCents: 0, amountCents: 500 })).toBe(true);
    expect(withinSpendLimit({ spentCents: 900, limitCents: 1000, amountCents: 500 })).toBe(false);
  });
});