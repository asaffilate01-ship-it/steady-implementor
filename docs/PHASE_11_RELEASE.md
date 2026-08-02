# Phase 11 CI closure and repository governance

Phase 11 repairs the incomplete Phase 10 upload at commit `ccafa625` and adds controls against the same path/deletion failure recurring.

## Delivered

- Deletes the tracked `.env` file.
- Deletes the accidental root-level `styles.css` duplicate.
- Applies the WCAG AA accent colour to the application stylesheet at `src/styles.css`.
- Formats the generated Supabase types and product database module.
- Regenerates the TanStack route tree.
- Extends repository hygiene to reject misplaced root styles or route-tree files and verify the application stylesheet import.
- Adds Code Owners, a release-safety pull request template and exact GitHub environment/ruleset instructions.
- Advances the package version to `0.11.0`.

## Expected result

After every replacement and both deletions are committed together:

- `check` should pass repository hygiene, type checking, linting, 30 application tests, release-evidence tests, 22 migrations, production build, generated-source validation, bundle budget and dependency audits.
- `browser-smoke` should pass ten desktop/mobile checks, including the two WCAG tests that failed at `ccafa625`.
- `release-candidate-evidence` should upload a validated candidate SBOM and manifest for the new commit.

GitHub-hosted Chromium remains the final proof for the page-rendering tests. A green candidate raises repository readiness but does not replace the external staging, provider, payment, legal, monitoring, backup and production-deployment gates in `docs/GO_LIVE_RUNBOOK.md`.
