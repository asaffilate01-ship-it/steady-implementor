# ParkPunkt v2 database migration

The secure product workflows are in `20260802094832_4e06ce9b-848b-4b71-a530-4af3abb76eb9.sql`. The go-live safety controls are in `20260802130000_go_live_inventory_and_evidence.sql`. Apply both after every earlier migration and before deploying the matching application build.

## What changes

- Business account creation becomes one atomic transaction, including the owner membership.
- Cost-centre and tariff writes are authorised inside security-definer functions.
- Support case and first-message creation becomes one atomic transaction.
- Parking sessions snapshot their tariff at start so later operator edits cannot alter an active driver's price rules.
- Start, extension and end calculations share one tariff calculator and persist the final quote with payment metadata.
- Seeded and imported sites remain private until an authorised operator verifies and publishes them.
- Enforcement evidence is stored in a private, role-protected bucket instead of accepting external URLs.
- Customer sessions and reservations are rejected for unpublished sites.

## Apply

```sh
npx supabase link --project-ref <project-ref>
npx supabase db push
```

Use Supabase's migration preview in staging first. Confirm the new functions exist, then test one driver session, one tariff update, one business account and one support case with non-administrator accounts.

## Deployment order

1. Back up the production database and confirm point-in-time recovery.
2. Apply the migration during a low-traffic window.
3. Deploy the application build from stages 1–3.
4. Complete the smoke tests in `docs/DEPLOYMENT.md`.
5. Inspect `audit_events` and payment metadata for the test records.

This migration is additive and uses `CREATE OR REPLACE FUNCTION`. Do not edit an already-applied migration; add a new forward migration for later changes.
