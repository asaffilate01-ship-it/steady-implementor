# ParkPunkt v2 database migration

The secure product workflows are in `20260802094832_4e06ce9b-848b-4b71-a530-4af3abb76eb9.sql`. The go-live safety controls are in `20260802130000_go_live_inventory_and_evidence.sql`. Apply both after every earlier migration and before deploying the matching application build.

## Upload-lineage note

`20260802103229_bbef8c30-a2e9-4bf9-8fce-2aea9ef81692.sql` contains an earlier idempotent version of most inventory-publication and evidence-policy controls. `20260802130000_go_live_inventory_and_evidence.sql` is the forward completion that also provisions the private `enforcement-evidence` bucket. Both are retained because the earlier migration may already be present in a linked Supabase migration table.

- Do not delete or edit `20260802103229_bbef8c30-a2e9-4bf9-8fce-2aea9ef81692.sql` after it has reached any shared environment.
- Apply all 22 migrations in order to a fresh staging project and retain the reset log.
- If Supabase reports a local/remote migration mismatch, stop and reconcile the migration ledger before production; do not mark migrations as applied merely to bypass the error.
- Future database changes must use a new timestamped forward migration.

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
