export type ReadinessItem = {
  key: string;
  label: string;
  ready: boolean;
  detail: string;
};

function present(env: Record<string, string | undefined>, ...keys: string[]) {
  return keys.every((key) => Boolean(env[key]?.trim()));
}

function recentDate(value: string | undefined, now: Date, maximumAgeDays: number) {
  if (!value) return false;
  const date = new Date(value);
  return (
    !Number.isNaN(date.getTime()) &&
    date.getTime() <= now.getTime() &&
    now.getTime() - date.getTime() <= maximumAgeDays * 86_400_000
  );
}

function truthy(value: string | undefined) {
  return value?.trim().toLowerCase() === "true";
}

function httpsUrl(value: string | undefined) {
  try {
    const url = new URL(value ?? "");
    return (
      url.protocol === "https:" &&
      !/(?:\.example|\.test|\.invalid|\.localhost)$|^localhost$/i.test(url.hostname)
    );
  } catch {
    return false;
  }
}

/** Returns only booleans and guidance; secret values never leave the server. */
export function buildLaunchReadiness(
  env: Record<string, string | undefined>,
  now = new Date(),
): ReadinessItem[] {
  const legalName = env.VITE_LEGAL_COMPANY_NAME?.trim();
  const legalReady = Boolean(
    legalName &&
    !/placeholder|your company|example/i.test(legalName) &&
    present(
      env,
      "VITE_LEGAL_STREET",
      "VITE_LEGAL_CITY",
      "VITE_LEGAL_MANAGING_DIRECTORS",
      "VITE_LEGAL_REGISTER_COURT",
      "VITE_LEGAL_REGISTER_NUMBER",
      "VITE_LEGAL_CONTACT_EMAIL",
      "VITE_LEGAL_PRIVACY_EMAIL",
      "VITE_LEGAL_ADR_STATEMENT",
    ) &&
    recentDate(env.LEGAL_REVIEWED_AT, now, 366),
  );
  const production = env.APP_ENV === "production" || env.NODE_ENV === "production";
  const liveStripe =
    env.STRIPE_SECRET_KEY?.startsWith("sk_live_") &&
    env.STRIPE_PUBLISHABLE_KEY?.startsWith("pk_live_") &&
    env.STRIPE_WEBHOOK_SECRET?.startsWith("whsec_");
  const providers = (env.PARKPUNKT_ENABLED_PROVIDER_SLUGS ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const providerFeedsReady = providers.every((slug) => {
    if (slug === "apcoa") return false;
    if (slug === "datex-berlin") return httpsUrl(env.BERLIN_PARKING_FEED_URL);
    if (slug === "opendata-hamburg") return httpsUrl(env.HAMBURG_PARKING_FEED_URL);
    return true;
  });

  return [
    {
      key: "environment",
      label: "Production environment selected",
      ready: production,
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
      ready: Boolean(production ? liveStripe : present(env, "STRIPE_SECRET_KEY")),
      detail: "Configure Stripe live publishable/secret keys and a signed webhook secret.",
    },
    {
      key: "scheduler",
      label: "Provider sync scheduler",
      ready: (env.PARKPUNKT_CRON_SECRET?.length ?? 0) >= 32 && truthy(env.SCHEDULER_CONFIGURED),
      detail: "Use a 32+ character secret and verify both production scheduler jobs.",
    },
    {
      key: "providers",
      label: "Approved production provider inventory",
      ready: providers.length > 0 && providerFeedsReady,
      detail: "Allowlist only adapters with verified contracts, parsers, tariffs and freshness.",
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
      ready: recentDate(env.BACKUP_VERIFIED_AT, now, 31),
      detail: "Set BACKUP_VERIFIED_AT after completing and documenting a restore test.",
    },
    {
      key: "migrations",
      label: "Staging migration rehearsal completed",
      ready: recentDate(env.DATABASE_MIGRATIONS_VERIFIED_AT, now, 31),
      detail: "Rehearse the full migration chain and smoke tests in staging within 31 days.",
    },
    {
      key: "observability",
      label: "Production monitoring and incident ownership",
      ready: truthy(env.OBSERVABILITY_CONFIGURED),
      detail: "Test alerts, dashboards, log retention and the incident escalation owner.",
    },
    {
      key: "readiness_secret",
      label: "Protected readiness probe",
      ready:
        (env.PARKPUNKT_READINESS_SECRET?.length ?? 0) >= 32 &&
        env.PARKPUNKT_READINESS_SECRET !== env.PARKPUNKT_CRON_SECRET,
      detail: "Use a distinct random 32+ character readiness bearer secret.",
    },
    {
      key: "safe_rollout",
      label: "Prototype customer flows disabled",
      ready: !truthy(env.VITE_FEATURE_SMART_MAP) && !truthy(env.VITE_FEATURE_TICKET_SCANNER),
      detail: "Keep the prototype map and unintegrated ticket settlement disabled in production.",
    },
  ];
}
