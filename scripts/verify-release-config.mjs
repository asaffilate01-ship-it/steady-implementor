import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const env = process.env;

const value = (key) => env[key]?.trim() ?? "";
const truthy = (key) => value(key).toLowerCase() === "true";
const present = (...keys) => keys.every((key) => value(key).length > 0);
const recentDate = (key, maximumAgeDays) => {
  const date = new Date(value(key));
  const now = new Date();
  return (
    !Number.isNaN(date.getTime()) &&
    date.getTime() <= now.getTime() &&
    now.getTime() - date.getTime() <= maximumAgeDays * 86_400_000
  );
};
const httpsUrl = (key) => {
  try {
    const url = new URL(value(key));
    return (
      url.protocol === "https:" &&
      !/(?:\.example|\.test|\.invalid|\.localhost)$|^localhost$/i.test(url.hostname)
    );
  } catch {
    return false;
  }
};

const enabledProviders = value("PARKPUNKT_ENABLED_PROVIDER_SLUGS")
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);

const releaseName = value("RELEASE_NAME");
const rollbackSha = value("ROLLBACK_SHA");
const currentSha = value("GITHUB_SHA");

const checks = [
  ["Production environment", value("APP_ENV") === "production"],
  ["Named release", releaseName.length >= 3 && !/placeholder|example/i.test(releaseName)],
  [
    "Rollback commit reference",
    /^[0-9a-f]{7,40}$/i.test(rollbackSha) &&
      (!currentSha || !currentSha.toLowerCase().startsWith(rollbackSha.toLowerCase())),
  ],
  [
    "Release approval reference",
    value("APPROVAL_REFERENCE").length >= 3 &&
      !/placeholder|example/i.test(value("APPROVAL_REFERENCE")),
  ],
  ["Canonical HTTPS origin", httpsUrl("PUBLIC_APP_URL")],
  [
    "Supabase server credentials",
    httpsUrl("SUPABASE_URL") && present("SUPABASE_PUBLISHABLE_KEY", "SUPABASE_SERVICE_ROLE_KEY"),
  ],
  [
    "Stripe live credentials",
    value("STRIPE_PUBLISHABLE_KEY").startsWith("pk_live_") &&
      value("STRIPE_SECRET_KEY").startsWith("sk_live_") &&
      value("STRIPE_WEBHOOK_SECRET").startsWith("whsec_"),
  ],
  [
    "Distinct internal bearer secrets",
    value("PARKPUNKT_CRON_SECRET").length >= 32 &&
      value("PARKPUNKT_READINESS_SECRET").length >= 32 &&
      value("PARKPUNKT_CRON_SECRET") !== value("PARKPUNKT_READINESS_SECRET"),
  ],
  ["Verified production scheduler", truthy("SCHEDULER_CONFIGURED")],
  [
    "Notification delivery gateway",
    httpsUrl("NOTIFICATION_DELIVERY_WEBHOOK_URL") &&
      value("NOTIFICATION_DELIVERY_WEBHOOK_SECRET").length >= 32,
  ],
  [
    "Approved provider allowlist",
    enabledProviders.length > 0 &&
      !enabledProviders.includes("apcoa") &&
      (!enabledProviders.includes("datex-berlin") || httpsUrl("BERLIN_PARKING_FEED_URL")) &&
      (!enabledProviders.includes("opendata-hamburg") || httpsUrl("HAMBURG_PARKING_FEED_URL")),
  ],
  ["Recent database restore test", recentDate("BACKUP_VERIFIED_AT", 31)],
  ["Recent staging migration rehearsal", recentDate("DATABASE_MIGRATIONS_VERIFIED_AT", 31)],
  ["Monitoring and incident ownership", truthy("OBSERVABILITY_CONFIGURED")],
  [
    "Registered legal identity",
    present(
      "VITE_LEGAL_COMPANY_NAME",
      "VITE_LEGAL_STREET",
      "VITE_LEGAL_CITY",
      "VITE_LEGAL_MANAGING_DIRECTORS",
      "VITE_LEGAL_REGISTER_COURT",
      "VITE_LEGAL_REGISTER_NUMBER",
      "VITE_LEGAL_CONTACT_EMAIL",
      "VITE_LEGAL_PRIVACY_EMAIL",
      "VITE_LEGAL_ADR_STATEMENT",
    ) && !/placeholder|your company|example/i.test(value("VITE_LEGAL_COMPANY_NAME")),
  ],
  ["Legal review within 12 months", recentDate("LEGAL_REVIEWED_AT", 366)],
  [
    "Prototype customer flows disabled",
    !truthy("VITE_FEATURE_SMART_MAP") && !truthy("VITE_FEATURE_TICKET_SCANNER"),
  ],
];

for (const [label, passed] of checks) {
  console.log(`${passed ? "PASS" : "FAIL"} ${label}`);
}

const evidenceDirectory = value("RELEASE_EVIDENCE_DIR");
if (evidenceDirectory) {
  mkdirSync(evidenceDirectory, { recursive: true });
  writeFileSync(
    join(evidenceDirectory, "release-config.json"),
    `${JSON.stringify(
      {
        schemaVersion: 1,
        generatedAt: new Date().toISOString(),
        commitSha: value("GITHUB_SHA") || "local-verification",
        checks: checks.map(([label, passed]) => ({ label, passed })),
      },
      null,
      2,
    )}\n`,
  );
}

const failed = checks.filter(([, passed]) => !passed);
if (failed.length) {
  console.error(`Release configuration blocked: ${failed.length} check(s) failed.`);
  process.exitCode = 1;
} else {
  console.log("Release configuration passed without exposing secret values.");
}
