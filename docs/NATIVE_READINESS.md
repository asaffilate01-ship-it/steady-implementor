# Native application readiness

The production product remains an installable responsive PWA. The `native/` folder contains compile-oriented iOS and Android starter projects for sharing domain contracts and proving native navigation; it is not a claim that signed store applications have been released.

## Production requirements

- Register Apple and Google application identifiers, signing teams, store records, privacy manifests and universal/app links.
- Use Supabase OAuth PKCE and platform secure storage for user refresh tokens. The publishable Supabase key may ship in an app; the service-role key and partner `pk_` keys may not.
- Call user-scoped Supabase tables/RPCs with the user's access token. The partner API in `openapi/parkpunkt-v1.yaml` is server-to-server and must not be called with a bundled partner key.
- Add App Attest/DeviceCheck and Play Integrity signals at the mobile BFF boundary for high-risk actions.
- Integrate Apple Pay and Google Pay through the Stripe mobile SDKs and complete wallet-domain/store review.
- Build native equivalents for camera permission education, location fallback, offline drafts, accessibility, receipts, support and payment recovery.
- Add device farms, crash reporting, release signing, staged rollout, forced-upgrade policy and tested rollback.

Start with read-only discovery and account access, then add session start/end and payments behind controlled release flags. Maintain the same tariff and provider contracts rather than duplicating pricing logic in each app.
