# Deployment and update guide

## Applying the staged update ZIPs

Apply the numbered ParkPunkt update packages in ascending order. For each package:

1. Extract the ZIP.
2. Copy everything inside `UPLOAD_TO_REPOSITORY_ROOT` into the repository root.
3. Preserve the folder structure and replace matching files.
4. Delete every path listed in `DELETE_FROM_REPOSITORY.txt`.
5. Commit the package before applying the next one.
6. Run `npm ci`, `npm run check`, `npm run security:audit:all` and `npm run test:e2e` after the final package.

## Supabase

Apply new SQL migrations in filename order to staging before production. Keep database migrations append-only after they have been deployed.

## Required deployment secrets

- Supabase browser and server configuration
- Supabase service-role key on the server only
- Stripe publishable, secret and webhook keys
- Provider/ANPR/barrier credentials
- Cron and notification delivery secrets
- A separate readiness-probe bearer secret
- Registered legal and privacy contact details
- A production provider allowlist and verified canonical feed URLs

## Release gate

Do not promote a release unless type checking, linting, unit tests, production build, browser smoke tests, migration review, role-isolation tests and a sandbox payment journey pass.

Successful CI runs on `main` and manual CI runs retain a release-candidate evidence artifact for 30 days. It contains the exact commit, recorded CI outcomes, production dependency SBOM and SHA-256 file manifest. Candidate evidence is useful for release selection but does not prove that production configuration or external operations are ready.

Configure the GitHub `production` environment and run the **Production release readiness** workflow. Provide a release name, a previously verified rollback SHA and the recorded approval or change reference. The workflow validates production-shaped configuration without printing secret values, runs the complete code, dependency, desktop/mobile Chromium and automated accessibility gates, and retains a sanitized evidence artifact for 90 days. Failed attempts also upload their available evidence before the workflow remains red, so release blockers are reviewable rather than disappearing at the first failed step. Branch protection should require CI, CodeQL and dependency review before merge.

Use `/api/public/health` for platform liveness. It performs no dependency calls. Configure the deployment platform's deeper readiness probe against `/api/public/readiness` with `Authorization: Bearer <PARKPUNKT_READINESS_SECRET>`; never expose that token to browser code.

Use a trusted external scheduler for both cron endpoints. Set `SCHEDULER_CONFIGURED=true` only after a production call to each endpoint succeeds with the cron bearer secret. Provider sync returns `207` for partial failure and `503` when every provider fails, so alert on any non-2xx response and on `ok: false`.
