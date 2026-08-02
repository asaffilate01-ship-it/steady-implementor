# Phase 8 CI recovery and release evidence

Phase 8 is a cumulative repository repair for the Phase 7 upload on `main`. It closes the remaining code-controlled CI failures and adds repeatable evidence for production promotion.

## Delivered

- Removes the tracked `.env` file while retaining `.env.example`.
- Applies the missing formatter output to generated Supabase types and the product database module.
- Commits the current generated TanStack route tree and blocks future generated-source drift.
- Resolves the high-severity development-toolchain advisory and audits both production and development dependencies.
- Runs browser smoke tests on desktop Chromium and the Pixel 7 mobile profile.
- Adds an axe-powered WCAG A/AA smoke gate for the public home, authentication and privacy pages.
- Produces a sanitized release summary, production-configuration result and CycloneDX production SBOM.
- Retains the release-evidence artifact for 90 days after a successful protected production-readiness run.

## Upload requirements

1. Copy `UPLOAD_TO_REPOSITORY_ROOT` to the repository root, preserving its folders.
2. Delete every path in `DELETE_FROM_REPOSITORY.txt`; copying files cannot remove `.env`.
3. Commit the changes through a pull request and require CI and CodeQL.
4. Confirm `npm ci`, `npm run check`, both dependency audits and all desktop/mobile browser tests pass.
5. Configure the protected `production` environment and run **Production release readiness**.

Phase 8 cannot create production credentials, contracts, legal approval, a backup-restore record or a live deployment. Those remain release-owner gates in `docs/GO_LIVE_RUNBOOK.md`.
