# ParkPunkt

**Finden. Parken. Bezahlen.**

ParkPunkt is a bilingual, multi-operator parking platform for drivers, businesses, parking operators, mobility providers, administrators and enforcement teams. The current web product is built with TanStack Start, React 19, Supabase, TypeScript and Stripe.

## Product areas

- Driver discovery, transparent tariff quotes, reservations, active sessions, payments, receipts, support and appeals.
- Vehicle profiles, favourites, accessibility preferences and private/business parking contexts.
- Operator sites, tariffs, occupancy, reports, analytics and operational alerts.
- Provider onboarding, API credentials, synchronisation health and inventory freshness.
- Enforcement plate checks, private evidence, offline-safe drafts and notice workflows.
- Administration, roles, organisations, provider commissions, refunds, settlements and audit activity.

## Local setup

Requirements: Node.js 22, npm and a Supabase project.

```sh
git clone https://github.com/asaffilate01-ship-it/steady-implementor.git
cd steady-implementor
cp .env.example .env.local
npm ci
npm run dev
```

Populate `.env.local` with your development credentials. Never commit `.env`, `.env.local`, the Supabase service-role key, Stripe secrets or provider credentials.

## Database

Apply every migration in `supabase/migrations` in filename order. The migration history includes the production payment lifecycle, transactional notification outbox, provider synchronisation, business/fleet records, flexible tariffs, access passes, support, enforcement evidence and row-level security policies.

```sh
npx supabase link --project-ref <project-ref>
npx supabase db push
```

Provision the first administrator through a controlled service-role or Supabase SQL-editor process. Public signup never grants an administrative role.

## Environment groups

- `VITE_SUPABASE_*`: browser-safe Supabase configuration.
- `SUPABASE_*`: server runtime configuration; the service-role key is server-only.
- `STRIPE_*`: Payment Element, server API and signed webhook configuration.
- `PARKPUNKT_CRON_SECRET`: scheduler authentication for provider and notification workers.
- `PARKPUNKT_READINESS_SECRET`: separate authentication for the protected dependency probe.
- `NOTIFICATION_DELIVERY_*`: trusted email/SMS/push gateway adapter.
- `VITE_LEGAL_*`: registered company, privacy and complaints details.
- `PARKPUNKT_ENABLE_DEMO_AUTH`, `VITE_ENABLE_DEMO_AUTH` and `PARKPUNKT_ALLOW_FIXTURE_INVENTORY`: keep `false` in production.
- `VITE_FEATURE_*`: non-secret progressive rollout switches documented in [`docs/FEATURE_FLAGS.md`](docs/FEATURE_FLAGS.md).

See [`.env.example`](.env.example) for the complete template.

## Payments and webhooks

Create a Stripe webhook endpoint at:

```text
https://your-domain.example/api/public/webhooks/stripe
```

Subscribe it to Payment Intent success, processing, failure and cancellation events, plus refunds and disputes. Webhook signatures are verified and events are persisted idempotently before processing.

## Provider and notification workers

Call the trusted scheduled endpoints with `Authorization: Bearer <PARKPUNKT_CRON_SECRET>`:

- `POST /api/public/cron/sync-providers`
- `POST /api/public/cron/dispatch-notifications`

Production adapters must fail visibly when a provider is unavailable; they must not silently substitute fixture inventory.

## Quality checks

```sh
npm run typecheck
npm run lint
npm run test
npm run build
npm run test:e2e
```

Run the main verification sequence with `npm run check`.

For a production promotion, configure the protected GitHub `production` environment, run the **Production release readiness** workflow, and follow [`docs/GO_LIVE_RUNBOOK.md`](docs/GO_LIVE_RUNBOOK.md). The release configuration can also be checked locally with `npm run check:release-config`; it reports only pass/fail categories and never secret values.

## External activation required

The repository cannot create commercial contracts or production credentials. Before public launch, connect contracted parking inventory, ANPR/barrier providers, Stripe live mode, wallet domains, notification gateways, monitoring and backups. Complete accessibility, GDPR/ANPR, payments and German parking-law reviews with qualified specialists.

The current repository is an installable web PWA. Separate native iOS and Android applications require their own signed app projects and store-release processes.

Further information is available in [`docs/PRODUCT_RELEASE.md`](docs/PRODUCT_RELEASE.md) and [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

Partner API consumers can use [`openapi/parkpunkt-v1.yaml`](openapi/parkpunkt-v1.yaml). Compile-oriented native starter projects and their production limitations are documented in [`native/README.md`](native/README.md) and [`docs/NATIVE_READINESS.md`](docs/NATIVE_READINESS.md).
