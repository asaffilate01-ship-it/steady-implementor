# ParkPunkt changes-only update

This package contains only the files changed or added for the ParkPunkt product release. It is not a complete repository.

## Apply the update

1. Open your existing `steady-implementor` repository in GitHub Desktop, VS Code, or another local Git client.
2. Copy everything inside `UPLOAD_TO_REPOSITORY_ROOT` into the root of that repository.
3. Allow existing files to be replaced while keeping the folder structure.
4. Delete the tracked `.env` file from the repository. It may contain secrets and is intentionally not included in this update.
5. Create your private local `.env.local` from `.env.example`. Do not commit `.env.local`.
6. Commit and push the update to GitHub.
7. Apply the three new Supabase migrations in filename order.
8. Run `npm ci` and then `npm run check` before deploying.

If you use only the GitHub website, upload the contents of `UPLOAD_TO_REPOSITORY_ROOT` to the repository root and then delete `.env` manually through GitHub.

## Important

- New deployment credentials, Stripe keys, notification-provider keys, and ANPR/barrier provider credentials must be configured separately.
- This update provides an installable web PWA and integration foundations; it does not include separate native iOS or Android projects.
- Keep `README-FIRST.md` and `DELETE-FROM-GITHUB.txt` outside the repository; they are package instructions only.
