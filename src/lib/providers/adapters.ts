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

function configuredFeedUrl(key: "BERLIN_PARKING_FEED_URL" | "HAMBURG_PARKING_FEED_URL") {
  const raw = process.env[key]?.trim();
  if (!raw) throw new Error(`${key} is not configured`);
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`${key} is not a valid URL`);
  }
  if (url.protocol !== "https:") throw new Error(`${key} must use HTTPS`);
  return url.toString();
}

async function canonicalFeed(
  key: "BERLIN_PARKING_FEED_URL" | "HAMBURG_PARKING_FEED_URL",
  fixture: UpstreamSite[],
) {
  try {
    const response = await fetch(configuredFeedUrl(key), {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return fixtureOrThrow(fixture, `${key} returned HTTP ${response.status}`);
    const contentLength = Number(response.headers.get("content-length") ?? 0);
    if (contentLength > 5_000_000) throw new Error(`${key} exceeded the 5 MB response limit`);
    const raw = (await response.json()) as { sites?: UpstreamSite[] };
    return Array.isArray(raw.sites) && raw.sites.length
      ? raw.sites
      : fixtureOrThrow(fixture, `${key} returned no canonical parking inventory`);
  } catch (error) {
    return fixtureOrThrow(fixture, `${key} unavailable: ${(error as Error).message}`);
  }
}

// --- Berlin DATEX II (public feed, no key) ------------------------------------
// Production uses a contracted/verified normalizer configured by URL. Raw DATEX II
// endpoints rotate and are not assumed to match ParkPunkt's canonical JSON contract.
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
    return canonicalFeed("BERLIN_PARKING_FEED_URL", BERLIN_FIXTURE);
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
    return canonicalFeed("HAMBURG_PARKING_FEED_URL", HAMBURG_FIXTURE);
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
