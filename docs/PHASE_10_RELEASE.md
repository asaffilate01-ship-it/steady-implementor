# Phase 10 CI and accessibility closure

Phase 10 responds to the first complete Phase 9 GitHub run at commit `a3c97df`. That run proved the npm lockfile repair worked, but also exposed an incomplete Lovable upload and one genuine WCAG regression.

## Delivered

- Deletes the tracked `.env` file while retaining `.env.example`.
- Applies the formatter output omitted from the Supabase types and product database modules.
- Regenerates and commits the current TanStack route tree.
- Darkens the ParkPunkt green accent from `oklch(0.58 0.16 148)` to `oklch(0.54 0.16 148)`, raising normal-text contrast against white from approximately 3.97:1 to approximately 4.7:1.
- Produces an HTML Playwright report in CI and uploads screenshots, traces and the report for 14 days when browser tests fail.
- Includes failed production-browser diagnostics in the existing sanitized production-readiness evidence artifact.

## Expected GitHub result

After all files and the deletion are committed together, the CI workflow should complete these jobs:

1. `check`: repository hygiene, type checking, linting, 30 application tests, three release-evidence tests, 22 migration checks, production build, generated-source validation, bundle budget and both dependency audits.
2. `browser-smoke`: ten desktop/mobile public-route, security, layout and WCAG smoke checks.
3. `release-candidate-evidence`: production SBOM, immutable summaries and SHA-256 manifest for the exact commit.

CodeQL and dependency review remain separate required checks. A green candidate is not production approval: the protected production environment, live credentials, staging database evidence, payment/provider acceptance, legal review, monitoring and deployment record remain mandatory in `docs/GO_LIVE_RUNBOOK.md`.

## Upload requirement

Use Git or the GitHub web interface. Copying files through Lovable has repeatedly omitted deletions and generated files. Confirm `.env` is absent from the repository tree before accepting the CI result.
