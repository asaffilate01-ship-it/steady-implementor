# ParkPunkt go-live runbook

This runbook is the release owner’s acceptance record. Do not mark an item complete from configuration alone; retain the referenced test evidence and deployment SHA.

## 1. Repository gate

- Protect `main`; require pull requests, CI, CodeQL and dependency review.
- Confirm `.env` and other local credential files are not tracked; `npm run check:repo` must pass.
- Run `npm ci`, `npm run check`, `npm run security:audit` and Chromium E2E from a clean checkout.
- Retain the successful CI release-candidate artifact for the intended SHA; confirm its status is `validated-candidate`, not `eligible`.
- Run the GitHub **Production release readiness** workflow using the protected `production` environment.
- Enter a human-readable release name, a previously verified rollback commit SHA and an approval/change reference.
- Download and retain the workflow's release-evidence artifact containing the approved commit SHA, sanitized configuration result, validation outcomes, CycloneDX production SBOM and SHA-256 manifest.
- Confirm `release-summary.json` says `releaseScope: production-web`, `releaseStatus: eligible` and `eligibleForProduction: true`. A `blocked` artifact is diagnostic evidence, not launch approval.
- Record the approved commit SHA and rollback commit independently of the artifact.
- If the default branch still begins at orphan commit `df1caa1`, follow `docs/GIT_HISTORY_RECOVERY.md` without force-pushing.

## 2. Database gate

- Create a fresh staging database and apply every migration in filename order.
- Review the `20260802103229`/`20260802130000` lineage note in `docs/DATABASE-MIGRATION_V2.md`; never delete a migration already recorded by a shared database.
- Confirm `20260802130000_go_live_inventory_and_evidence.sql` is applied.
- Verify driver, operator, provider, enforcement and admin tenant isolation with separate accounts.
- Confirm seeded/imported sites are drafts and cannot be quoted, reserved or started by customers.
- Publish one verified test site, complete a session, then unpublish it and confirm new transactions are rejected.
- Complete a backup restore test and set `BACKUP_VERIFIED_AT` and `DATABASE_MIGRATIONS_VERIFIED_AT`.

## 3. Payments gate

- Configure Stripe live publishable, secret and webhook keys only in the production secret store.
- Register the canonical HTTPS webhook and required Payment Intent, refund and dispute events.
- Complete successful, failed, cancelled, duplicate-webhook, refund and dispute journeys.
- Reconcile the resulting payment, platform fee, operator net and payout records.
- Register wallet domains before enabling Apple Pay or Google Pay.

## 4. Inventory and scheduler gate

- Keep APCOA disabled until its contracted adapter replaces the stub.
- Verify each canonical provider feed, parser, tariff, occupancy semantics, timeout and stale-data behavior.
- Add only accepted slugs to `PARKPUNKT_ENABLED_PROVIDER_SLUGS`.
- Run one manual sync, inspect the records, and publish only confirmed sites.
- Schedule provider sync and notification dispatch with the cron bearer secret.
- Alert on partial (`207`) and complete (`503`) provider failures and notification dead letters.

## 5. Privacy, legal and enforcement gate

- Replace every `VITE_LEGAL_*` placeholder with the registered operator details.
- Obtain German counsel approval for the imprint, terms, privacy, retention, refunds, complaints and ADR statements; set `LEGAL_REVIEWED_AT`.
- Complete a GDPR/DPIA assessment for location, ANPR and enforcement processing where applicable.
- Upload and retrieve an enforcement image using separate officer/admin accounts; confirm drivers and unrelated users cannot read the private object.
- Approve evidence retention, deletion, access logging and subject-access procedures.

## 6. Production operations gate

- Configure canonical DNS, TLS, `PUBLIC_APP_URL`, security headers and both protected probes.
- Verify logs, alerts, dashboards, incident owner, escalation contacts and status communications.
- Complete a production smoke test on desktop and mobile. The automated axe gate must be green, followed by keyboard, screen-reader, large-text and contrast checks.
- Keep `VITE_FEATURE_SMART_MAP=false` and `VITE_FEATURE_TICKET_SCANNER=false` until their contracted integrations are implemented and separately accepted.
- Set `OBSERVABILITY_CONFIGURED=true` and `SCHEDULER_CONFIGURED=true` only after live verification.

## Release decision

The release owner records: production SHA, migration version, workflow URL, retained release-evidence artifact, its SHA-256 manifest, smoke-test evidence, rollback owner, approval time and any explicitly accepted residual risk. A failed readiness item or a release artifact not marked `eligible` blocks public launch.
