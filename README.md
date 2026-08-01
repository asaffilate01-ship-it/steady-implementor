# ParkPunkt

ParkPunkt is a bilingual parking marketplace and operations platform for drivers, parking operators, inventory providers, administrators, and enforcement teams. It is built with TanStack Start, React 19, Supabase, Tailwind CSS, and TypeScript.

## Product areas

- **Driver journey:** search nearby parking, compare ranked quotes, start or reserve parking, extend an active stay, pay securely, receive status updates, and manage notices or appeals.
- **Operator workspace:** view organisation-owned sites, adjust tariffs and occupancy, and create new sites.
- **Provider workspace:** manage integrations and API keys while monitoring inventory freshness and sync failures.
- **Enforcement workspace:** check one vehicle at a specific site, retain evidence metadata, and review driver appeals without exposing the full session dataset.
- **Admin workspace:** manage organisations, user roles, provider records, commissions, launch readiness, payment refunds, settlement reconciliation, and audit activity.
- **Public API:** retrieve filtered, ranked parking quotes from `/api/public/v1/orchestrate/quote`.

## Security model

Price-sensitive and ownership-sensitive operations run through authenticated, `SECURITY DEFINER` database functions. The browser cannot choose a final price, mark a payment as paid, assign an organisation, or read another organisation's operational records.

Payments created by session, reservation, and notice flows begin as `pending`. Stripe Payment Intents collect payment details, but only signature-verified, idempotently persisted webhook events can mark a payment paid, failed, refunded, cancelled, or disputed. Refunds are initiated by an administrator and finalized through the same webhook lifecycle.

The quote API uses an atomic database rate-limit bucket, so simultaneous requests cannot race a count-then-insert limiter. The scheduled provider sync accepts only a separate 32+ character bearer secret; a Supabase publishable key is never used as a cron credential.

The security and production migrations are:

- [`supabase/migrations/20260801130000_production_foundation.sql`](supabase/migrations/20260801130000_production_foundation.sql)
- [`supabase/migrations/20260801150000_production_completion.sql`](supabase/migrations/20260801150000_production_completion.sql)

## Local setup

Requirements:

- Node.js 22
- npm
- A Supabase project with the migrations in `supabase/migrations` applied

```sh
git clone https://github.com/asaffilate01-ship-it/steady-implementor.git
cd steady-implementor
cp .env.example .env.local
npm ci
npm run dev
```

Fill `.env.local` before starting. Client code uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`; trusted server functions additionally require `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.

Never expose `SUPABASE_SERVICE_ROLE_KEY` in a `VITE_` variable or commit a populated environment file.

## Environment variables

| Variable                               | Purpose                                                          |
| -------------------------------------- | ---------------------------------------------------------------- |
| `VITE_SUPABASE_URL`                    | Browser Supabase project URL                                     |
| `VITE_SUPABASE_PUBLISHABLE_KEY`        | Browser-safe Supabase key                                        |
| `SUPABASE_URL`                         | Server Supabase project URL                                      |
| `SUPABASE_SERVICE_ROLE_KEY`            | Server-only service role key                                     |
| `APP_ENV`                              | Deployment environment; set to `production` for the live app     |
| `PUBLIC_APP_URL`                       | Canonical HTTPS application origin                               |
| `STRIPE_PUBLISHABLE_KEY`               | Browser-safe Stripe publishable key returned by the server       |
| `STRIPE_SECRET_KEY`                    | Server-only Stripe secret key                                    |
| `STRIPE_WEBHOOK_SECRET`                | Signature secret for `/api/public/webhooks/stripe`               |
| `PARKPUNKT_CRON_SECRET`                | 32+ character secret for provider sync                           |
| `BACKUP_VERIFIED_AT`                   | Date of the latest successful restore test                       |
| `NOTIFICATION_DELIVERY_WEBHOOK_URL`    | Trusted email/SMS/push gateway endpoint                          |
| `NOTIFICATION_DELIVERY_WEBHOOK_SECRET` | Bearer secret shared with the delivery gateway                   |
| `PARKPUNKT_ENABLE_DEMO_AUTH`           | Enables server-side demo account provisioning outside production |
| `VITE_ENABLE_DEMO_AUTH`                | Shows the demo-auth panel in a development build                 |
| `PARKPUNKT_ALLOW_FIXTURE_INVENTORY`    | Allows local fixture inventory outside production                |
| `VITE_LEGAL_*`                         | Registered operator and legal contact details                    |

See [`.env.example`](.env.example) for the complete list. Keep all demo switches `false` in production.

## Database and first admin

Apply migrations with your normal Supabase workflow, for example:

```sh
npx supabase link --project-ref <project-ref>
npx supabase db push
```

The app deliberately does not promote the first public signup to administrator. Provision the initial admin through a controlled service-role/admin workflow, then use the admin dashboard for later role assignments. Operator and provider roles must be linked to an organisation of the matching kind.

For example, after the intended administrator has created and confirmed their account, run this once from the trusted Supabase SQL editor, replacing the email:

```sql
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM auth.users
WHERE lower(email) = lower('owner@your-domain.example')
ON CONFLICT (user_id, role) DO NOTHING;
```

## Provider synchronisation

Call the trusted endpoint from a scheduler:

```sh
curl -X POST https://your-domain.example/api/public/cron/sync-providers \
  -H "Authorization: Bearer $PARKPUNKT_CRON_SECRET"
```

Production provider failures are reported instead of silently substituting demo inventory. Every run records start/completion timestamps, status, errors, and created/updated counts. Synced sites are assigned to an operator organisation so operator access remains tenant-scoped.

## Notification delivery

Every in-app notification creates a transactional outbox item. Call the dispatcher from the same trusted scheduler:

```sh
curl -X POST https://your-domain.example/api/public/cron/dispatch-notifications \
  -H "Authorization: Bearer $PARKPUNKT_CRON_SECRET"
```

The dispatcher sends an idempotent request to `NOTIFICATION_DELIVERY_WEBHOOK_URL`, authenticated with `NOTIFICATION_DELIVERY_WEBHOOK_SECRET`. The gateway can fan the event out to email, SMS, or push based on the user ID and notification type. Failed deliveries use exponential backoff, recover abandoned processing locks, and move to a visible dead-letter state after eight attempts.

## Stripe payment setup

Create a Stripe webhook endpoint pointing to:

```text
https://your-domain.example/api/public/webhooks/stripe
```

Subscribe it to these events:

- `payment_intent.processing`
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `payment_intent.canceled`
- `charge.refunded`
- `charge.dispute.created`
- `charge.dispute.closed`

Set `STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`, and the endpoint's signing secret as `STRIPE_WEBHOOK_SECRET`. Use Stripe test mode and the Stripe CLI while developing. Never use live keys in `.env.local` on a shared machine.

Webhook payloads are retained in `payment_webhook_events` for idempotency and reconciliation. That table is service-role-only. Payment records intentionally do not store card numbers or Payment Element client secrets.

## Notices, evidence and appeals

New notices are linked to the most recent matching session owner when one can be resolved safely. Drivers can read only notices assigned to their user ID, create one appeal before the deadline, and create a server-priced notice payment. Enforcement/admin users can review appeals and must record a written decision. Evidence metadata supports observation time, officer notes and secure photo URLs; use private, access-controlled evidence URLs in production.

## Settlements and refunds

The admin operations console can create transactionally consistent settlement batches from paid, eligible payments. Each payment can belong to one settlement item only. Mark a payout paid only after the bank/payment-provider transfer exists, and enter that external reference for reconciliation.

The refund action submits a full remaining refund to Stripe. The dashboard does not optimistically mark it complete; Stripe webhook events remain the source of truth.

## Health and monitoring

`GET /api/public/health` performs a minimal database readiness check and returns `200` when healthy or `503` when degraded. Point deployment health checks at this endpoint. It deliberately exposes no credentials, table contents, or exception details.

The admin readiness panel reports configuration as booleans only. It also shows failed webhooks, provider health, pending appeals, payment state totals, and recent audit events. Set `BACKUP_VERIFIED_AT` only after a real restore test; it expires from readiness after 31 days.

## Quality checks

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
```

Run all checks with:

```sh
npm run check
```

After a successful build, preview the generated Nitro/Cloudflare output with `npm run preview`.

GitHub Actions runs type, lint, unit, production-build, and Chromium smoke/security checks for pushes and pull requests.

## Production checklist

- Apply every Supabase migration and verify row-level security policies.
- Provision the first administrator through a trusted process.
- Configure production Supabase and server-only service-role environment variables.
- Configure Stripe live-mode keys and a signed webhook endpoint; run test payments, failures, refunds, and disputes first.
- Generate and configure a strong `PARKPUNKT_CRON_SECRET` in both the app and scheduler.
- Leave demo authentication and fixture inventory disabled.
- Enter the actual registered-company and contact details for every `VITE_LEGAL_*` value.
- Create at least one provider alert and confirm failed syncs/webhooks page the on-call owner.
- Run a database backup and restore test, then set `BACKUP_VERIFIED_AT`.
- Reconcile a test settlement batch against a real sandbox payout reference.
- Point deployment monitoring at `/api/public/health` and retain application logs centrally.
- Test driver, operator, provider, enforcement, and admin roles in separate accounts.
- Review the legal pages with qualified counsel before launch.

## Installable web app

The production build registers a small service worker and web app manifest. Static assets are cached, authenticated/API responses are not. The offline screen clearly blocks inventory, session and payment actions until connectivity returns.

## Lovable

This repository remains connected to the [Lovable project](https://lovable.dev/projects/b728c831-f225-449d-9765-7edf1e997c5d). Changes pushed to the repository can be continued in Lovable.
