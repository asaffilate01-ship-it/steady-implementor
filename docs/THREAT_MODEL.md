# ParkPunkt threat model

## Protected assets

ParkPunkt handles account identities, registration plates, precise parking activity, payment state, enforcement evidence, operator inventory, provider credentials and settlement records. Service-role, Stripe, provider, notification, cron and readiness secrets are server-only assets.

## Trust boundaries

1. Browser/PWA to TanStack server functions and public API routes.
2. TanStack server to Supabase, Stripe, notification gateways and parking providers.
3. Supabase authenticated roles and row-level security to service-role workers.
4. Provider inventory and webhook input to ParkPunkt's canonical records.
5. CI and deployment systems to production secrets and database migrations.

## Primary abuse cases and controls

| Risk                               | Main controls                                                                    | Remaining work                                                  |
| ---------------------------------- | -------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Cross-tenant data access           | RLS, organisation checks, server-side role checks, role-isolation tests          | Continuous policy regression tests against staging              |
| Forged payment state               | Stripe signature verification, idempotent event ledger, server-side processing   | Reconciliation alerts and dispute drills                        |
| Price manipulation                 | Server-validated tariff writes, audit events, immutable session tariff snapshots | Four-eyes approval for unusually large tariff changes           |
| Partial business/support records   | Transactional SQL functions                                                      | Idempotency keys for retrying external clients                  |
| Credential exposure                | Environment separation, committed template only, secret rotation runbook         | Enable repository push protection and environment approvals     |
| Provider data poisoning            | Adapter validation, freshness/status records, explicit failures                  | Provider-specific signed requests and anomaly thresholds        |
| Enforcement evidence leakage       | RLS and authenticated workflows                                                  | Private storage bucket, retention automation and access logging |
| XSS/clickjacking/data exfiltration | CSP, frame denial, output encoding, no dangerous HTML APIs                       | Replace inline-script allowance with per-response CSP nonces    |
| Availability failure               | Lightweight liveness, protected readiness, rate limits, worker retries           | Multi-region failover and tested recovery objectives            |

## Review triggers

Review this model whenever a new payment method, parking provider, identity provider, native app, evidence type, analytics destination or cross-border data flow is introduced. Record the decision and data-retention impact before launch.
