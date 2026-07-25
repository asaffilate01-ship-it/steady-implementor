# Multi-Provider Aggregation for ParkPunkt

Goal: let ParkPunkt aggregate parking inventory from multiple German providers (commercial operators, municipal on-street systems, open city feeds) into one unified search — and expose our own orchestrate API to partners.

## 1. Database schema

New tables (all with RLS + GRANTs):

- **`providers`** — `id, name, slug, kind (operator|municipal|datex|handyparken), country, contact_email, api_base_url, auth_type (none|api_key|oauth2|basic), status (active|paused|onboarding), notes`
- **`provider_credentials`** — `provider_id, credential_ref` (name of the secret stored via `add_secret`, never the raw value)
- **`site_provider_mapping`** — `site_id, provider_id, external_site_id, last_synced_at` (one site can map to one upstream)
- **`api_keys`** — `id, provider_id (nullable, for partner keys), name, key_hash, key_prefix, scopes (text[]), last_used_at, revoked_at` — used to authenticate inbound calls to our public orchestrate API. Raw key shown once on creation.
- **`api_request_log`** — `id, api_key_id, path, status, latency_ms, created_at` — for rate-limit + audit (7-day retention).

RLS: only `admin` and `provider` roles can read/write providers, mappings, and keys. Regular users see nothing.

## 2. Adapter layer (server-only)

`src/lib/providers/` with a shared interface:

```ts
export interface ProviderAdapter {
  slug: string;
  listSites(): Promise<UpstreamSite[]>;
  getAvailability(externalId: string): Promise<{ capacity: number; occupied: number }>;
  quote?(externalId: string, minutes: number): Promise<{ amount_cents: number; currency: string }>;
}
```

Ship two working adapters + one stub:
- **`datex-berlin.ts`** — real, pulls Berlin's open DATEX II parking feed (public, no key needed).
- **`opendata-hamburg.ts`** — real, Hamburg Transparenzportal parking JSON.
- **`apcoa.ts`** — stub with the correct interface + TODO for credentials; documents the onboarding steps.

Adapters live under `src/lib/providers/` and are imported only from server functions / server routes.

## 3. Sync job

Server route `src/routes/api/public/cron/sync-providers.ts` — authenticated by a shared `CRON_SECRET` header. Iterates active providers, runs each adapter's `listSites` + `getAvailability`, upserts into `sites`, updates `site_provider_mapping.last_synced_at`. Safe to call from pg_cron or an external scheduler. Manual "Sync now" button in admin UI calls it too.

## 4. Public Orchestrate API

`src/routes/api/public/v1/orchestrate/quote.ts` — real HTTP endpoint partners can call.

- Auth: `Authorization: Bearer pk_…` matched against `api_keys.key_hash` (SHA-256).
- Input (validated with Zod): `{ lat, lng, radius_m?, duration_minutes, max_results? }`.
- Output: ranked list of `{ site_id, name, address, distance_m, available, capacity, quote: { amount_cents, currency } }`.
- Rate limit: 60 req/min per key (rolling window in `api_request_log`).
- CORS: `*` on this route; no cookies, key-only.
- Logs every call for audit.

## 5. Provider Hub upgrades (`/provider`)

- New **Providers** tab: list registered providers with status, kind, last-synced, "Sync now" button.
- **API Keys** tab: create/revoke partner keys. Raw key shown once in a copy-to-clipboard modal, then only prefix + `last_used_at`.
- **Live orchestrate** panel: existing "Run request" now calls the real `/api/public/v1/orchestrate/quote` with the current user's own dev key so operators see exactly what partners see. Also shows a curl snippet.
- **Request log**: last 50 calls (path, status, latency) from `api_request_log`.

## 6. Admin UI additions (`/admin`)

- New **Providers** section: register a provider (name, kind, base URL, auth type), attach a credential (opens `add_secret` flow with a suggested name), toggle active/paused, delete.
- **Site mapping**: quick view of how many sites each provider contributes.

## 7. i18n

All new labels (Providers, Adapters, API keys, Sync now, Revoke, Rate limit exceeded, etc.) added to both `en` and `de` in `src/lib/i18n.tsx`.

## 8. Security posture

- Raw API keys never stored; only SHA-256 hash + 8-char prefix.
- Provider credentials stored via Lovable Cloud secrets, referenced by name only in `provider_credentials.credential_ref`.
- Public orchestrate endpoint returns only public site fields — no user data, no session data, no internal IDs beyond `site_id`.
- Rate limiting + audit log on the public endpoint.
- RLS locks the new tables to `admin` / `provider` roles.

## Out of scope for this step

- Real APCOA / Contipark / EasyPark commercial integrations (need signed contracts + credentials from the customer).
- OAuth-based provider auth flows (stubbed in the adapter interface, not wired).
- Payment settlement between ParkPunkt and providers (separate revenue-share module).

## Deliverables order

1. Migration (schema + RLS + GRANTs)
2. Adapter interface + 2 real + 1 stub adapter
3. Sync route + admin "Sync now"
4. Public orchestrate API + key auth + rate limit
5. Provider Hub tabs (Providers, API Keys, Live orchestrate, Logs)
6. Admin Providers section
7. i18n for everything above
8. Verify: typecheck, hit the public endpoint end-to-end with a generated key
