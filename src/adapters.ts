export type QuoteCandidate = {
  distance_m: number;
  available: number;
};

export function filterAndRankQuotes<T extends QuoteCandidate>(
  candidates: T[],
  radiusM: number,
  maxResults: number,
): T[] {
  return candidates
    .filter((site) => site.distance_m <= radiusM && site.available > 0)
    .sort((a, b) => a.distance_m - b.distance_m)
    .slice(0, maxResults);
}

export function quoteAmountCents(priceCentsPerHour: number, minutes: number): number {
  if (
    !Number.isFinite(priceCentsPerHour) ||
    !Number.isFinite(minutes) ||
    priceCentsPerHour < 0 ||
    minutes < 0
  ) {
    throw new Error("Price and duration must be non-negative finite numbers");
  }
  return Math.round((priceCentsPerHour * minutes) / 60);
}

export function normalizePlate(plate: string): string {
  return plate.trim().replace(/\s+/g, " ").toUpperCase();
}
