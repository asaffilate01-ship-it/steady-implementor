# ParkPunkt product experience release

This repository contains the combined production, commercial-feature and UI/UX release. It is designed to be uploaded to the existing GitHub repository as one project.

## Delivered

- Map-first, mobile-first driver home with live inventory confidence and filters.
- Multiple country-aware vehicles, defaults and personal/business/family profiles.
- Favourites, entrance navigation, opening/access information and incorrect-data reports.
- Transparent tariff calculations with minimum charges, service fees, reservation fees, caps and maximum stays.
- Immediate parking, advance reservations and QR/ANPR/barrier access-pass records.
- Focused active-session timer, extensions, directions and expiry preferences.
- Stripe-backed secure wallet presentation and itemised receipt/payment lifecycle.
- Accessibility preferences for step-free results, large type, contrast and reduced motion.
- In-context support cases and notification preferences.
- Business/fleet accounts, cost centres, assigned vehicles, limits and accounting export.
- Operator attention centre, live map, tariff studio, site configuration and analytics.
- Provider onboarding/readiness checklist and live-sync health.
- Enforcement private evidence bucket, evidence fingerprints and safe offline drafts.

## External activation required

The code cannot invent commercial contracts or production credentials. Activate these before public launch:

1. Apply all Supabase migrations, including `20260801180000_product_experience.sql`.
2. Configure Stripe live-mode keys, wallet domains and signed webhooks.
3. Connect contracted parking inventory/ANPR/barrier adapters and test fallback QR flows.
4. Configure the notification delivery gateway for email, SMS and push.
5. Configure central monitoring, backups and incident ownership.
6. Complete accessibility, privacy, payments and parking-law reviews with qualified specialists.

## Recommended deployment sequence

1. Deploy to a staging Supabase project and apply migrations.
2. Create separate test users for driver, business, operator, provider, enforcement and admin roles.
3. Test successful, failed, disputed and refunded payments.
4. Test stale/offline inventory and ANPR/QR fallback behaviour.
5. Test keyboard, screen-reader, large-text, contrast and reduced-motion modes.
6. Reconcile a sandbox settlement and restore a database backup.
7. Promote the same build and migration set to production.
