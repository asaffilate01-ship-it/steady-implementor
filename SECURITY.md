# Security policy

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability. Use GitHub's private vulnerability reporting for this repository, or contact the security address configured for the deployed ParkPunkt organisation.

Include the affected route or component, reproduction steps, impact, and any safe proof of concept. Do not access another person's data, disrupt a production service, run denial-of-service tests, or publish credentials.

The team should acknowledge a complete report within three business days, provide a triage decision within seven business days, and coordinate disclosure after a fix is available. These are targets rather than a bug-bounty commitment.

## Supported versions

Only the latest deployed `main` release receives security updates. Secrets belong in the deployment secret store, never Git. Rotate a credential immediately if it appears in a commit, log, screenshot or support record. `npm run check:repo` blocks tracked environment files, private-key files, common live-secret signatures and unpinned third-party workflow actions.

## Baseline controls

- Supabase row-level security plus authenticated server functions for privileged mutations.
- Signed, idempotent Stripe webhooks and server-only service credentials.
- CSRF protection for server functions, strict browser response headers, request correlation IDs and structured logs.
- Pinned CI actions, lockfile installs, dependency review, high-severity production and development audits, CodeQL scanning and a CycloneDX production SBOM.
- Desktop/mobile browser security smoke tests plus an automated serious/critical WCAG A/AA violation gate for public launch pages.
- Separate secrets for scheduled workers and protected readiness probes.

See `docs/THREAT_MODEL.md` for system boundaries and `docs/INCIDENT_RESPONSE.md` for operational handling.
