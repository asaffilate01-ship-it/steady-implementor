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
});
