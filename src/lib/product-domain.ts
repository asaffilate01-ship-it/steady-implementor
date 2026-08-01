/** Pure, testable helpers for the ParkPunkt product experience layer. */

export type TariffInput = {
  price_cents_per_hour: number;
  free_minutes?: number;
  minimum_charge_cents?: number;
  service_fee_cents?: number;
  reservation_fee_cents?: number;
  daily_cap_cents?: number | null;
  max_stay_minutes?: number | null;
};

export type TariffQuote = {
  minutes: number;
  chargeableMinutes: number;
  parkingCents: number;
  serviceFeeCents: number;
  reservationFeeCents: number;
  totalCents: number;
  cappedByDailyCap: boolean;
  exceedsMaxStay: boolean;
};

/** Transparent tariff calculation: free minutes, minimum charge, fees and caps. */
export function computeTariffQuote(
  tariff: TariffInput,
  minutes: number,
  options: { reservation?: boolean } = {},
): TariffQuote {
  const safeMinutes = Math.max(0, Math.round(minutes));
  const free = Math.max(0, tariff.free_minutes ?? 0);
  const chargeableMinutes = Math.max(0, safeMinutes - free);

  let parkingCents =
    chargeableMinutes === 0
      ? 0
      : Math.round((tariff.price_cents_per_hour * chargeableMinutes) / 60);

  if (chargeableMinutes > 0) {
    parkingCents = Math.max(parkingCents, tariff.minimum_charge_cents ?? 0);
  }

  const dailyCap = tariff.daily_cap_cents ?? null;
  const cappedByDailyCap = dailyCap !== null && parkingCents > dailyCap;
  if (cappedByDailyCap && dailyCap !== null) parkingCents = dailyCap;

  const serviceFeeCents = chargeableMinutes > 0 ? (tariff.service_fee_cents ?? 0) : 0;
  const reservationFeeCents = options.reservation ? (tariff.reservation_fee_cents ?? 0) : 0;

  return {
    minutes: safeMinutes,
    chargeableMinutes,
    parkingCents,
    serviceFeeCents,
    reservationFeeCents,
    totalCents: parkingCents + serviceFeeCents + reservationFeeCents,
    cappedByDailyCap,
    exceedsMaxStay: tariff.max_stay_minutes != null && safeMinutes > tariff.max_stay_minutes,
  };
}

/** Normalises European plates: upper case, single spaces, no stray punctuation. */
export function normalizeEuropeanPlate(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9ÄÖÜ\- ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function isValidPlate(raw: string): boolean {
  const plate = normalizeEuropeanPlate(raw);
  return plate.length >= 2 && plate.length <= 16;
}

/** Deterministic, human-readable access-pass code (QR / barrier keypad). */
export function buildAccessPassCode(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  let value = hash;
  for (let i = 0; i < 8; i += 1) {
    code += alphabet[value % alphabet.length];
    value = Math.floor(value / alphabet.length) + 7;
  }
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

export type SpendGuardInput = {
  spentCents: number;
  limitCents: number;
  amountCents: number;
};

/** Fleet spend guard: zero limit means unlimited. */
export function withinSpendLimit({ spentCents, limitCents, amountCents }: SpendGuardInput) {
  if (limitCents <= 0) return true;
  return spentCents + amountCents <= limitCents;
}
