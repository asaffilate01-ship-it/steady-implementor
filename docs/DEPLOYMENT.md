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
- Registered legal and privacy contact details

## Release gate

Do not promote a release unless type checking, linting, unit tests, production build, browser smoke tests, migration review, role-isolation tests and a sandbox payment journey pass.
