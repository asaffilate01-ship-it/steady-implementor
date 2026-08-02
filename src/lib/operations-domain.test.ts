import { describe, expect, it } from "vitest";
import { buildLaunchReadiness } from "./operations-domain";

describe("buildLaunchReadiness", () => {
  it("never returns environment values", () => {
    const secret = "sensitive-service-key-value";
    const result = buildLaunchReadiness({
      APP_ENV: "production",
      SUPABASE_URL: "https://database.example",
      SUPABASE_PUBLISHABLE_KEY: "public",
      SUPABASE_SERVICE_ROLE_KEY: secret,
    });
    expect(JSON.stringify(result)).not.toContain(secret);
  });

  it("requires a recent verified restore", () => {
    const now = new Date("2026-08-01T00:00:00Z");
    expect(
      buildLaunchReadiness({ BACKUP_VERIFIED_AT: "2026-07-15" }, now).find(
        (item) => item.key === "backups",
      )?.ready,
    ).toBe(true);
    expect(
      buildLaunchReadiness({ BACKUP_VERIFIED_AT: "2026-01-01" }, now).find(
        (item) => item.key === "backups",
      )?.ready,
    ).toBe(false);
  });

  it("requires live Stripe keys in production", () => {
    const result = buildLaunchReadiness({
      APP_ENV: "production",
      STRIPE_PUBLISHABLE_KEY: "pk_test_example",
      STRIPE_SECRET_KEY: "sk_test_example",
      STRIPE_WEBHOOK_SECRET: "whsec_example",
    });
    expect(result.find((item) => item.key === "payments")?.ready).toBe(false);

    const live = buildLaunchReadiness({
      APP_ENV: "production",
      STRIPE_PUBLISHABLE_KEY: "pk_live_example",
      STRIPE_SECRET_KEY: "sk_live_example",
      STRIPE_WEBHOOK_SECRET: "whsec_example",
    });
    expect(live.find((item) => item.key === "payments")?.ready).toBe(true);
  });

  it("fails closed when prototype customer flows are enabled", () => {
    const safe = buildLaunchReadiness({
      VITE_FEATURE_SMART_MAP: "false",
      VITE_FEATURE_TICKET_SCANNER: "false",
    });
    expect(safe.find((item) => item.key === "safe_rollout")?.ready).toBe(true);

    const unsafe = buildLaunchReadiness({ VITE_FEATURE_TICKET_SCANNER: "true" });
    expect(unsafe.find((item) => item.key === "safe_rollout")?.ready).toBe(false);
  });

  it("requires distinct internal secrets", () => {
    const shared = "same-secret-value-that-is-at-least-32-characters";
    const result = buildLaunchReadiness({
      PARKPUNKT_CRON_SECRET: shared,
      PARKPUNKT_READINESS_SECRET: shared,
      SCHEDULER_CONFIGURED: "true",
    });
    expect(result.find((item) => item.key === "readiness_secret")?.ready).toBe(false);
  });
});
