# Required GitHub repository settings

These controls are configured in GitHub and cannot be activated by committed source files alone.

## Protect `main`

Create a branch ruleset for `main` and enable:

- Require a pull request before merging.
- Require conversation resolution.
- Require branches to be up to date before merging.
- Block force pushes and branch deletion.
- Require these status checks: `check`, `browser-smoke`, `analyze` and `review`.
- Require Code Owner review after a second trusted maintainer is added. Do not enable a one-review minimum while the repository has only one contributor, because authors cannot approve their own pull requests.
- Restrict bypass permission to the emergency release owner and document every bypass.

Use GitHub or GitHub Desktop for release changes. Do not use Lovable to apply update ZIPs because it has repeatedly omitted deletions and changed repository paths.

## Create environments

Create `staging` and `production` environments. Restrict `production` to `main`, require an approval and prevent self-service secret changes during a release.

Add production secrets:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_PUBLISHABLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `PARKPUNKT_CRON_SECRET`
- `PARKPUNKT_READINESS_SECRET`
- `NOTIFICATION_DELIVERY_WEBHOOK_SECRET`

Add production variables:

- `PUBLIC_APP_URL`
- `NOTIFICATION_DELIVERY_WEBHOOK_URL`
- `PARKPUNKT_ENABLED_PROVIDER_SLUGS`
- `BERLIN_PARKING_FEED_URL` and `HAMBURG_PARKING_FEED_URL` when approved
- `SCHEDULER_CONFIGURED`
- `OBSERVABILITY_CONFIGURED`
- `BACKUP_VERIFIED_AT`
- `DATABASE_MIGRATIONS_VERIFIED_AT`
- `LEGAL_REVIEWED_AT`
- Every required `VITE_LEGAL_*` value listed in `.env.example`

Never copy a service-role, Stripe secret, webhook secret or bearer secret into a repository variable or source file.

## First accepted release

1. Merge only after CI, CodeQL and dependency review are green.
2. Retain the release-candidate artifact for the selected commit.
3. Apply migrations to staging and complete the acceptance gates in `docs/GO_LIVE_RUNBOOK.md`.
4. Run **Production release readiness** with the release name, verified rollback SHA and approval reference.
5. Retain the eligible production evidence artifact and its manifest.
6. Deploy the same commit, record the deployment URL and complete production smoke checks.
