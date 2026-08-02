# Deployment and update guide

## Applying the staged update ZIPs

Apply the numbered ParkPunkt update packages in ascending order. For each package:

1. Extract the ZIP.
2. Copy everything inside `UPLOAD_TO_REPOSITORY_ROOT` into the repository root.
3. Preserve the folder structure and replace matching files.
4. Delete every path listed in `DELETE_FROM_REPOSITORY.txt`.
5. Commit the package before applying the next one.
6. Run `npm ci` and `npm run check` after the final package.

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

Configure the GitHub `production` environment and run the **Production release readiness** workflow. It validates production-shaped configuration without printing secret values and then runs the complete code, dependency and Chromium gates. Branch protection should require CI, CodeQL and dependency review before merge.

Use `/api/public/health` for platform liveness. It performs no dependency calls. Configure the deployment platform's deeper readiness probe against `/api/public/readiness` with `Authorization: Bearer <PARKPUNKT_READINESS_SECRET>`; never expose that token to browser code.

Use a trusted external scheduler for both cron endpoints. Set `SCHEDULER_CONFIGURED=true` only after a production call to each endpoint succeeds with the cron bearer secret. Provider sync returns `207` for partial failure and `503` when every provider fails, so alert on any non-2xx response and on `ok: false`.
