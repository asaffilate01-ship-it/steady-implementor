import { normalizePlate } from "@/lib/parking-domain";

export type TariffQuoteInput = {
  minutes: number;
  priceCentsPerHour: number;
  minimumChargeCents?: number | null;
  serviceFeeCents?: number | null;
  reservationFeeCents?: number | null;
  dailyCapCents?: number | null;
  maxStayMinutes?: number | null;
};

export type TariffQuote = {
  parkingCents: number;
  serviceFeeCents: number;
  reservationFeeCents: number;
  totalCents: number;
  capApplied: boolean;
};

export function calculateTariffQuote(input: TariffQuoteInput): TariffQuote {
  const numbers = [
    input.minutes,
    input.priceCentsPerHour,
    input.minimumChargeCents ?? 0,
    input.serviceFeeCents ?? 0,
    input.reservationFeeCents ?? 0,
    input.dailyCapCents ?? 0,
  ];
  if (numbers.some((value) => !Number.isFinite(value) || value < 0)) {
    throw new Error("Tariff values must be non-negative finite numbers");
  }
  if (input.minutes < 1) throw new Error("Parking duration must be at least one minute");
  if (input.maxStayMinutes && input.minutes > input.maxStayMinutes) {
    throw new Error("Selected duration exceeds the maximum stay");
  }

  const uncapped = Math.max(
    input.minimumChargeCents ?? 0,
    Math.ceil((input.priceCentsPerHour * input.minutes) / 60),
  );
  const cap = input.dailyCapCents;
  const parkingCents = cap && cap > 0 ? Math.min(uncapped, cap) : uncapped;
  const serviceFeeCents = input.serviceFeeCents ?? 0;
  const reservationFeeCents = input.reservationFeeCents ?? 0;
  return {
    parkingCents,
    serviceFeeCents,
    reservationFeeCents,
    totalCents: parkingCents + serviceFeeCents + reservationFeeCents,
    capApplied: parkingCents < uncapped,
  };
}

export type AvailabilityConfidence = "live" | "estimated" | "stale" | "offline";

export function availabilityConfidence(
  updatedAt: string | null | undefined,
  status: string | null | undefined,
  now = Date.now(),
): AvailabilityConfidence {
  if (status === "offline") return "offline";
  if (!updatedAt) return "stale";
  const ageMs = Math.max(0, now - new Date(updatedAt).getTime());
  if (!Number.isFinite(ageMs)) return "stale";
  if (status === "stale" || ageMs > 15 * 60_000) return "stale";
  if (status === "estimated" || ageMs > 3 * 60_000) return "estimated";
  return "live";
}

export function formatFreshness(updatedAt: string | null | undefined, now = Date.now()): string {
  if (!updatedAt) return "Update time unavailable";
  const seconds = Math.max(0, Math.round((now - new Date(updatedAt).getTime()) / 1000));
  if (seconds < 60) return `Updated ${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `Updated ${minutes}m ago`;
  return `Updated ${Math.round(minutes / 60)}h ago`;
}

export function normalizeEuropeanPlate(registration: string, countryCode: string): string {
  const country = countryCode.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(country)) throw new Error("Use a two-letter country code");
  const plate = normalizePlate(registration);
  if (plate.length < 2 || plate.length > 16 || !/^[A-Z0-9ÄÖÜ -]+$/.test(plate)) {
    throw new Error("Enter a valid registration number");
  }
  return plate;
}

export type DiscoveryCandidate = {
  distanceKm: number;
  free: number;
  capacity: number;
  priceCentsPerHour: number;
  isOpen: boolean;
  confidence: AvailabilityConfidence;
  matchesAccessibility: boolean;
  matchesEv: boolean;
};

export function discoveryScore(candidate: DiscoveryCandidate): number {
  if (!candidate.isOpen || candidate.free <= 0 || candidate.confidence === "offline") {
    return Number.POSITIVE_INFINITY;
  }
  const occupancyRatio = candidate.capacity > 0 ? 1 - candidate.free / candidate.capacity : 1;
  const freshnessPenalty =
    candidate.confidence === "live" ? 0 : candidate.confidence === "estimated" ? 1.2 : 4;
  const accessPenalty = candidate.matchesAccessibility ? 0 : 3;
  const evPenalty = candidate.matchesEv ? 0 : 1.5;
  return (
    candidate.distanceKm * 2.2 +
    candidate.priceCentsPerHour / 180 +
    occupancyRatio * 3 +
    freshnessPenalty +
    accessPenalty +
    evPenalty
  );
}

export function safeExternalDirectionsUrl(lat: number, lng: number): string {
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    throw new Error("Invalid directions coordinates");
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${lat},${lng}`)}`;
}
