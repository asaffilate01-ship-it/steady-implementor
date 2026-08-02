# ParkPunkt product experience release

This release combines the production, commercial-feature and UI/UX foundations for ParkPunkt.

## Delivered

- Driver discovery, multiple vehicles, favourites, access information and live inventory confidence.
- Flexible tariff calculations with minimum charges, fees, daily caps and maximum stays.
- Immediate parking, reservations and QR/ANPR/barrier access-pass records.
- Stripe Payment Intents, signed/idempotent webhooks, refunds, disputes and settlement records.
- Business accounts, cost centres and fleet foundations.
- Operator, provider, enforcement and administrative workspaces.
- Support, notifications, appeals, audit events and production health reporting.
- Private enforcement evidence storage and safe observation drafts.
- Installable PWA, CI checks and Supabase row-level security foundations.

## External activation required

1. Apply all Supabase migrations in filename order.
2. Configure Stripe live-mode keys, wallet domains and the signed webhook.
3. Connect contracted parking inventory, ANPR and barrier adapters.
4. Configure the email/SMS/push delivery gateway.
5. Configure monitoring, backups, incident ownership and provider alerting.
6. Complete accessibility, privacy, payments and parking-law reviews.

## Deployment sequence

1. Deploy to a staging Supabase project and apply migrations.
2. Create separate driver, business, operator, provider, enforcement and admin test users.
3. Test successful, failed, disputed and refunded payments.
4. Test stale inventory, provider failure and ANPR/QR fallback behaviour.
5. Test keyboard, screen-reader, large-text, contrast and reduced-motion modes.
6. Reconcile a sandbox settlement and restore a database backup.
7. Promote the same build and migration set to production.
