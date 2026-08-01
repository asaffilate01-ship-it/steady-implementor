# ParkPunkt

ParkPunkt is a bilingual parking marketplace and operations platform for drivers, parking operators, inventory providers, administrators, and enforcement teams. It is built with TanStack Start, React 19, Supabase, Tailwind CSS, and TypeScript.

## Product areas

- **Driver journey:** search nearby parking, compare ranked quotes, start or reserve parking, extend an active stay, and finish a session.
- **Operator workspace:** view organisation-owned sites, adjust tariffs and occupancy, and create new sites.
- **Provider workspace:** manage integrations, API keys, and inventory synchronisation.
- **Enforcement workspace:** check one vehicle at a specific site and issue or resolve parking notices without exposing the full session dataset.
- **Admin workspace:** manage organisations, user roles, provider records, commissions, and platform operations.
- **Public API:** retrieve filtered, ranked parking quotes from `/api/public/v1/orchestrate/quote`.

## Security model

Price-sensitive and ownership-sensitive operations run through authenticated, `SECURITY DEFINER` database functions. The browser cannot choose a final price, mark a payment as paid, assign an organisation, or read another organisation's operational records.

Payments created by session and reservation flows begin as `pending`. A payment provider integration must confirm the final status server-side. The scheduled provider sync accepts only a separate 32+ character bearer secret; a Supabase publishable key is never used as a cron credential.

The production foundation is defined in [`supabase/migrations/20260801130000_production_foundation.sql`](supabase/migrations/20260801130000_production_foundation.sql).

## Local setup

Requirements:

- Node.js 22
- npm
- A Supabase project with the migrations in `supabase/migrations` applied

```sh
git clone https://github.com/asaffilate01-ship-it/steady-implementor.git
cd steady-implementor
cp .env.example .env.local
npm ci
npm run dev
```

Fill `.env.local` before starting. Client code uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`; trusted server functions additionally require `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.

Never expose `SUPABASE_SERVICE_ROLE_KEY` in a `VITE_` variable or commit a populated environment file.

## Environment variables

| Variable                            | Purpose                                                          |
| ----------------------------------- | ---------------------------------------------------------------- |
| `VITE_SUPABASE_URL`                 | Browser Supabase project URL                                     |
| `VITE_SUPABASE_PUBLISHABLE_KEY`     | Browser-safe Supabase key                                        |
| `SUPABASE_URL`                      | Server Supabase project URL                                      |
| `SUPABASE_SERVICE_ROLE_KEY`         | Server-only service role key                                     |
| `PARKPUNKT_CRON_SECRET`             | 32+ character secret for provider sync                           |
| `PARKPUNKT_ENABLE_DEMO_AUTH`        | Enables server-side demo account provisioning outside production |
| `VITE_ENABLE_DEMO_AUTH`             | Shows the demo-auth panel in a development build                 |
| `PARKPUNKT_ALLOW_FIXTURE_INVENTORY` | Allows local fixture inventory outside production                |
| `VITE_LEGAL_*`                      | Registered operator and legal contact details                    |

See [`.env.example`](.env.example) for the complete list. Keep all demo switches `false` in production.

## Database and first admin

Apply migrations with your normal Supabase workflow, for example:

```sh
npx supabase link --project-ref <project-ref>
npx supabase db push
```

The app deliberately does not promote the first public signup to administrator. Provision the initial admin through a controlled service-role/admin workflow, then use the admin dashboard for later role assignments. Operator and provider roles must be linked to an organisation of the matching kind.

For example, after the intended administrator has created and confirmed their account, run this once from the trusted Supabase SQL editor, replacing the email:

```sql
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM auth.users
WHERE lower(email) = lower('owner@your-domain.example')
ON CONFLICT (user_id, role) DO NOTHING;
```

## Provider synchronisation

Call the trusted endpoint from a scheduler:

```sh
curl -X POST https://your-domain.example/api/public/cron/sync-providers \
  -H "Authorization: Bearer $PARKPUNKT_CRON_SECRET"
```

Production provider failures are reported instead of silently substituting demo inventory. Synced sites are assigned to an operator organisation so operator access remains tenant-scoped.

## Quality checks

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

Run all checks with:

```sh
npm run check
```

After a successful build, preview the generated Nitro/Cloudflare output with `npm run preview`.

GitHub Actions runs the same type, lint, test, and production-build checks for pushes and pull requests.

## Production checklist

- Apply every Supabase migration and verify row-level security policies.
- Provision the first administrator through a trusted process.
- Configure production Supabase and service-role environment variables.
- Generate and configure a strong `PARKPUNKT_CRON_SECRET` in both the app and scheduler.
- Leave demo authentication and fixture inventory disabled.
- Enter the actual registered-company and contact details for every `VITE_LEGAL_*` value.
- Connect a payment processor/webhook before taking real payments; do not treat `pending` payments as settled.
- Test driver, operator, provider, enforcement, and admin roles in separate accounts.
- Review the legal pages with qualified counsel before launch.

## Lovable

This repository remains connected to the [Lovable project](https://lovable.dev/projects/b728c831-f225-449d-9765-7edf1e997c5d). Changes pushed to the repository can be continued in Lovable.
