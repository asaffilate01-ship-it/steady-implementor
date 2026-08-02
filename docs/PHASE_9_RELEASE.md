# Phase 9 CI recovery and durable release evidence

Phase 9 completes the Phase 8 repository upload and makes release evidence both automatic and honest. It does not manufacture proof for credentials, migrations, payments, providers, legal approval, monitoring or a live deployment.

## CI recovery

- Rebuilds `package-lock.json` from `package.json`, including `@axe-core/playwright` and `axe-core` 4.12.1.
- Removes the tracked `.env` file while keeping the safe `.env.example` template.
- Applies the missing formatter output to the Supabase types and product database modules.
- Regenerates and commits the TanStack route tree.
- Runs repository hygiene, type checking, linting, unit tests, release-evidence tests, migration validation, production build, generated-source drift, bundle budget, both dependency audits, and desktop/mobile browser tests.

## Release-candidate evidence

After both normal CI jobs pass on `main` or a manual CI run, GitHub Actions creates a 30-day `parkpunkt-release-candidate-<sha>` artifact. It contains:

- the exact commit and workflow run URL;
- recorded validation outcomes;
- a CycloneDX production dependency SBOM;
- human-readable and JSON summaries; and
- a SHA-256 manifest for every included evidence file.

The candidate is explicitly marked `validated-candidate` and `eligibleForProduction: false`. It cannot be confused with production approval.

## Production readiness evidence

The protected production workflow now requires a release name, rollback commit and approval reference. Independent gates record their outcomes so one failed check does not erase the rest of the diagnostic record. The workflow uploads all available sanitized evidence and then fails if any production gate, SBOM creation or evidence upload did not succeed.

A successful production artifact is marked `eligible` only when every automated gate reports `success`. This is necessary release evidence, not proof that the application was actually deployed or that the manual database, payment, provider, legal and operational acceptance work is complete.

## Required owner actions

1. Upload this phase through Git or the GitHub web interface so the `.env` deletion and large lockfile are included.
2. Merge only after CI, CodeQL and dependency review pass.
3. Configure and protect the GitHub `production` environment and its secrets/variables.
4. Complete the external acceptance work in `docs/GO_LIVE_RUNBOOK.md`.
5. Run **Production release readiness**, retain the artifact, deploy the exact eligible SHA, and separately record deployment and rollback evidence.
