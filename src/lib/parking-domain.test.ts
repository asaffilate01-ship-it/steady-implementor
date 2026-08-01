import { describe, expect, it } from "vitest";
import { filterAndRankQuotes, normalizePlate, quoteAmountCents } from "./parking-domain";

describe("filterAndRankQuotes", () => {
  it("removes unavailable and out-of-radius inventory before ranking", () => {
    const result = filterAndRankQuotes(
      [
        { id: "far", distance_m: 6000, available: 10 },
        { id: "full", distance_m: 100, available: 0 },
        { id: "near", distance_m: 250, available: 3 },
        { id: "nearer", distance_m: 150, available: 1 },
      ],
      5000,
      10,
    );

    expect(result.map((site) => site.id)).toEqual(["nearer", "near"]);
  });

  it("applies the result limit after sorting", () => {
    const result = filterAndRankQuotes(
      [
        { id: "third", distance_m: 300, available: 1 },
        { id: "first", distance_m: 100, available: 1 },
        { id: "second", distance_m: 200, available: 1 },
      ],
      1000,
      2,
    );

    expect(result.map((site) => site.id)).toEqual(["first", "second"]);
  });
});

describe("parking price and plate helpers", () => {
  it("rounds quotes to integer cents", () => {
    expect(quoteAmountCents(350, 45)).toBe(263);
  });

  it("normalizes plate casing and whitespace", () => {
    expect(normalizePlate("  b-pp   2026 ")).toBe("B-PP 2026");
  });
});
