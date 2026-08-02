import type { UpstreamSite } from "./adapters";

const MAX_SITES_PER_SYNC = 10_000;

/** Fail closed before provider-controlled data reaches canonical inventory tables. */
export function validateProviderSites(
  providerSlug: string,
  values: UpstreamSite[],
): UpstreamSite[] {
  if (!Array.isArray(values)) throw new Error(`${providerSlug}: adapter response is not an array`);
  if (values.length > MAX_SITES_PER_SYNC) {
    throw new Error(`${providerSlug}: adapter exceeded the ${MAX_SITES_PER_SYNC} site sync limit`);
  }
  const ids = new Set<string>();
  return values.map((value, index) => {
    const prefix = `${providerSlug}: site ${index + 1}`;
    const external_id = text(value.external_id, `${prefix} has an invalid external ID`, 160);
    if (ids.has(external_id))
      throw new Error(`${providerSlug}: duplicate external ID ${external_id}`);
    ids.add(external_id);
    const capacity = integer(value.capacity, `${prefix} has invalid capacity`, 1, 1_000_000);
    const occupied = integer(value.occupied ?? 0, `${prefix} has invalid occupancy`, 0, capacity);
    return {
      external_id,
      name: text(value.name, `${prefix} has an invalid name`, 200),
      address:
        value.address == null ? null : text(value.address, `${prefix} has an invalid address`, 500),
      lat: finite(value.lat, `${prefix} has invalid latitude`, -90, 90),
      lng: finite(value.lng, `${prefix} has invalid longitude`, -180, 180),
      capacity,
      occupied,
      price_cents_per_hour: integer(
        value.price_cents_per_hour,
        `${prefix} has an invalid price`,
        0,
        100_000,
      ),
      type: text(value.type, `${prefix} has an invalid type`, 40),
      operator_name: text(value.operator_name, `${prefix} has an invalid operator`, 200),
    };
  });
}

function text(value: unknown, message: string, max: number) {
  if (typeof value !== "string") throw new Error(message);
  const normalized = value.trim();
  if (!normalized || normalized.length > max) throw new Error(message);
  return normalized;
}

function integer(value: unknown, message: string, min: number, max: number) {
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) {
    throw new Error(message);
  }
  return value;
}

function finite(value: unknown, message: string, min: number, max: number) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    throw new Error(message);
  }
  return value;
}
