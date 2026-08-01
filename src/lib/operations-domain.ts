export type ReadinessItem = {
  key: string;
  label: string;
  ready: boolean;
  detail: string;
};

function present(env: Record<string, string | undefined>, ...keys: string[]) {
  return keys.every((key) => Boolean(env[key]?.trim()));
}

/** Returns only booleans and guidance; secret values never leave the server. */
export function buildLaunchReadiness(
  env: Record<string, string | undefined>,
  now = new Date(),
): ReadinessItem[] {
  const backupDate = env.BACKUP_VERIFIED_AT ? new Date(env.BACKUP_VERIFIED_AT) : null;
  const recentBackup =
    backupDate !== null &&
    !Number.isNaN(backupDate.getTime()) &&
    now.getTime() - backupDate.getTime() <= 31 * 86_400_000;
  const legalName = env.VITE_LEGAL_COMPANY_NAME?.trim();
  const legalReady = Boolean(legalName && !/placeholder|your company|example/i.test(legalName));

  return [
    {
      key: "environment",
      label: "Production environment selected",
      ready: env.APP_ENV === "production" || env.NODE_ENV === "production",
      detail: "Set APP_ENV=production in the production deployment.",
    },
    {
      key: "database",
      label: "Database service credentials",
      ready: present(env, "SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY", "SUPABASE_SERVICE_ROLE_KEY"),
      detail: "Configure the URL, publishable key and server-only service role key.",
    },
    {
      key: "payments",
      label: "Stripe payment processing",
      ready: present(env, "STRIPE_SECRET_KEY", "STRIPE_PUBLISHABLE_KEY", "STRIPE_WEBHOOK_SECRET"),
      detail: "Configure live-mode keys and the signed webhook secret.",
    },
    {
      key: "scheduler",
      label: "Provider sync scheduler",
      ready: (env.PARKPUNKT_CRON_SECRET?.length ?? 0) >= 32,
      detail: "Use a random 32+ character scheduler bearer secret.",
    },
    {
      key: "notifications",
      label: "Outbound notification gateway",
      ready:
        /^https:\/\//.test(env.NOTIFICATION_DELIVERY_WEBHOOK_URL ?? "") &&
        (env.NOTIFICATION_DELIVERY_WEBHOOK_SECRET?.length ?? 0) >= 32,
      detail: "Configure the email/SMS/push delivery gateway URL and bearer secret.",
    },
    {
      key: "origin",
      label: "Canonical HTTPS application URL",
      ready: /^https:\/\//.test(env.PUBLIC_APP_URL ?? ""),
      detail: "Set PUBLIC_APP_URL to the final HTTPS origin.",
    },
    {
      key: "legal",
      label: "Legal company identity",
      ready: legalReady,
      detail: "Replace legal placeholders with the registered operating entity.",
    },
    {
      key: "backups",
      label: "Restore test completed in last 31 days",
      ready: recentBackup,
      detail: "Set BACKUP_VERIFIED_AT after completing and documenting a restore test.",
    },
  ];
}
