// Server-only adapter interface + built-in adapters for aggregating parking
// inventory from third-party providers into ParkPunkt.

export type UpstreamSite = {
  external_id: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  capacity: number;
  occupied?: number;
  price_cents_per_hour: number;
  type: string;
  operator_name: string;
};

export interface ProviderAdapter {
  slug: string;
  listSites(): Promise<UpstreamSite[]>;
  getAvailability?(externalId: string): Promise<{ capacity: number; occupied: number }>;
}

function fixtureOrThrow(fixture: UpstreamSite[], message: string): UpstreamSite[] {
  const fixturesEnabled =
    process.env.NODE_ENV !== "production" &&
    process.env.PARKPUNKT_ALLOW_FIXTURE_INVENTORY === "true";
  if (fixturesEnabled) return fixture;
  throw new Error(message);
}

// --- Berlin DATEX II (public feed, no key) ------------------------------------
// Berlin publishes on-street and off-street parking as a DATEX II feed via the
// Mobilithek portal. Feed URLs rotate; this adapter uses a stable mirror when
// available and falls back to a fixture so /admin sync always returns rows.
const BERLIN_FIXTURE: UpstreamSite[] = [
  {
    external_id: "berlin-mitte-alexa",
    name: "ALEXA Center",
    address: "Grunerstraße 20, 10179 Berlin",
    lat: 52.5219,
    lng: 13.4132,
    capacity: 900,
    occupied: 620,
    price_cents_per_hour: 350,
    type: "garage",
    operator_name: "Contipark",
  },
  {
    external_id: "berlin-mitte-dom",
    name: "Parkhaus Am Dom",
    address: "Karl-Liebknecht-Str. 3, 10178 Berlin",
    lat: 52.5194,
    lng: 13.402,
    capacity: 450,
    occupied: 310,
    price_cents_per_hour: 400,
    type: "garage",
    operator_name: "APCOA",
  },
  {
    external_id: "berlin-kreuzberg-street-42",
    name: "Oranienstr. Zone 42",
    address: "Oranienstraße 42, 10999 Berlin",
    lat: 52.5,
    lng: 13.423,
    capacity: 40,
    occupied: 27,
    price_cents_per_hour: 200,
    type: "on-street",
    operator_name: "Berlin Handyparken",
  },
];
export const datexBerlin: ProviderAdapter = {
  slug: "datex-berlin",
  async listSites() {
    try {
      // Attempt live public endpoint; fall back to fixture on any failure.
      const res = await fetch("https://data.mobilithek.info/parking/berlin/latest.json", {
        signal: AbortSignal.timeout(6000),
      });
      if (!res.ok) return fixtureOrThrow(BERLIN_FIXTURE, `Berlin feed returned HTTP ${res.status}`);
      const raw = (await res.json()) as { sites?: UpstreamSite[] };
      return Array.isArray(raw.sites) && raw.sites.length
        ? raw.sites
        : fixtureOrThrow(BERLIN_FIXTURE, "Berlin feed returned no parking inventory");
    } catch (error) {
      return fixtureOrThrow(BERLIN_FIXTURE, `Berlin feed unavailable: ${(error as Error).message}`);
    }
  },
};

// --- Hamburg Open Data --------------------------------------------------------
const HAMBURG_FIXTURE: UpstreamSite[] = [
  {
    external_id: "hh-rathaus",
    name: "Parkhaus Rathaus",
    address: "Große Bleichen 21, 20354 Hamburg",
    lat: 53.5511,
    lng: 9.9937,
    capacity: 350,
    occupied: 240,
    price_cents_per_hour: 380,
    type: "garage",
    operator_name: "APCOA",
  },
  {
    external_id: "hh-hbf-nord",
    name: "Hauptbahnhof Nord",
    address: "Kirchenallee 34, 20099 Hamburg",
    lat: 53.5535,
    lng: 10.006,
    capacity: 500,
    occupied: 410,
    price_cents_per_hour: 420,
    type: "garage",
    operator_name: "Contipark",
  },
  {
    external_id: "hh-street-stpauli",
    name: "St. Pauli Zone 3",
    address: "Reeperbahn, 20359 Hamburg",
    lat: 53.5495,
    lng: 9.9635,
    capacity: 60,
    occupied: 45,
    price_cents_per_hour: 250,
    type: "on-street",
    operator_name: "Hamburg Handyparken",
  },
];
export const opendataHamburg: ProviderAdapter = {
  slug: "opendata-hamburg",
  async listSites() {
    try {
      const res = await fetch(
        "https://api.hamburg.de/datasets/v1/parkhaeuser/collections/parkhaeuser/items?f=json&limit=50",
        { signal: AbortSignal.timeout(6000) },
      );
      if (!res.ok)
        return fixtureOrThrow(HAMBURG_FIXTURE, `Hamburg feed returned HTTP ${res.status}`);
      const raw = (await res.json()) as {
        features?: Array<{
          id: string;
          properties: Record<string, unknown>;
          geometry?: { coordinates?: [number, number] };
        }>;
      };
      const feats = raw.features ?? [];
      if (!feats.length)
        return fixtureOrThrow(HAMBURG_FIXTURE, "Hamburg feed returned no parking inventory");
      return feats.slice(0, 50).map((f) => {
        const p = f.properties as Record<string, unknown>;
        const coords = f.geometry?.coordinates ?? [9.99, 53.55];
        return {
          external_id: `hh-${f.id}`,
          name: String(p.name ?? p.bezeichnung ?? `Site ${f.id}`),
          address: (p.adresse as string) ?? null,
          lat: coords[1],
          lng: coords[0],
          capacity: Number(p.stellplaetze ?? p.capacity ?? 100),
          occupied: Number(p.belegt ?? 0),
          price_cents_per_hour: 300,
          type: "garage",
          operator_name: String(p.betreiber ?? "Hamburg Parken"),
        } satisfies UpstreamSite;
      });
    } catch (error) {
      return fixtureOrThrow(
        HAMBURG_FIXTURE,
        `Hamburg feed unavailable: ${(error as Error).message}`,
      );
    }
  },
};

// --- APCOA stub ---------------------------------------------------------------
// Commercial operator. Requires a signed contract + API key stored via
// `add_secret` and referenced from provider_credentials.credential_ref.
export const apcoaStub: ProviderAdapter = {
  slug: "apcoa",
  async listSites() {
    // TODO: wire real APCOA Connect API once credentials are provisioned.
    // Header: `Authorization: Bearer ${process.env[credential_ref]}`
    return [];
  },
};

const ALL: Record<string, ProviderAdapter> = {
  [datexBerlin.slug]: datexBerlin,
  [opendataHamburg.slug]: opendataHamburg,
  [apcoaStub.slug]: apcoaStub,
};

export function getAdapter(slug: string): ProviderAdapter | null {
  return ALL[slug] ?? null;
}

export function listAdapterSlugs(): string[] {
  return Object.keys(ALL);
}
