# Phase 7 go-live repository repair

Phase 7 repairs the repository-controlled launch gates found after the go-live snapshot was uploaded to `main` on 2 August 2026.

## Delivered

- Synchronised `package-lock.json` with `package.json` so a clean `npm ci` can run.
- Applied the repository formatter to the generated Supabase types and product database module.
- Refreshed the generated TanStack route tree so a production build leaves the tracked source clean.
- Removed the tracked `.env` file while preserving the safe `.env.example` template.
- Added `npm run check:repo` to reject tracked environment/key files, common secret signatures and unpinned third-party GitHub Actions.
- Raised the production dependency audit gate from critical to high severity.
- Updated pinned checkout, Node setup and CodeQL action revisions.
- Added manual CI dispatch and aligned CI/release workflows with package scripts.
- Documented the two-stage go-live migration lineage and the non-destructive Git-history recovery procedure.

## Required after upload

1. Delete `.env` from the repository; copying replacement files alone does not remove it.
2. Open a pull request from a feature branch and require CI, CodeQL and dependency review.
3. Confirm `npm ci`, `npm run check`, `npm run security:audit` and Chromium E2E are green in GitHub Actions.
4. Configure the protected `production` environment and run **Production release readiness**.
5. Complete every evidence item in `docs/GO_LIVE_RUNBOOK.md` before enabling public payments.

Phase 7 does not create production credentials, provider contracts, legal approval, a database restore record or a deployment. Those remain explicit release-owner acceptance gates.
