# Parking provider integration

Provider adapters implement `ProviderAdapter` in `src/lib/providers/adapters.ts`. Production adapters must return canonical `UpstreamSite` records, use explicit timeouts, and fail visibly when an upstream system is unavailable. Fixture inventory is disabled in production and allowed in development only when `PARKPUNKT_ALLOW_FIXTURE_INVENTORY=true`.

Production sync is deny-by-default. Add a slug to `PARKPUNKT_ENABLED_PROVIDER_SLUGS` only after its commercial and technical acceptance checks pass. The built-in Berlin and Hamburg adapters require verified HTTPS normalizers configured through `BERLIN_PARKING_FEED_URL` and `HAMBURG_PARKING_FEED_URL`; raw municipal feeds are not assumed to provide ParkPunkt's live availability or tariff contract.

Every sync response passes `validateProviderSites` before database writes. The contract rejects duplicate IDs, invalid coordinates, impossible occupancy, negative or extreme prices, oversized text and unexpectedly large batches.

## Adding an adapter

1. Add a server-only adapter with a stable slug and credential reference. Never put a provider secret in a `VITE_` variable.
2. Map the upstream response to `UpstreamSite`; do not pass unrecognised fields through.
3. Add representative contract/parser tests, including malformed and partial upstream data.
4. Register the adapter and provider record in staging.
5. Exercise timeout, 401, 429, empty-feed, duplicate-ID and malformed-location cases.
6. Confirm freshness and failure status in the provider and admin dashboards.
7. Define reconciliation ownership, support escalation and upstream rate limits before production activation.
8. Add the slug to the production allowlist, run one manual sync, inspect every mapped tariff and then publish approved sites from the operator workspace.

The built-in APCOA entry is a stub and is not a commercial integration. A signed provider agreement, documented API access and production credentials are external launch requirements.

New and imported sites are drafts. `is_public` must be set through the audited publication action after capacity, occupancy, price, address and source are verified. The driver and partner quote APIs expose only published inventory.
