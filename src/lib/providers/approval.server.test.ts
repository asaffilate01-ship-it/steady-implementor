import { describe, expect, it } from "vitest";
import { approvedProviderSlugs, assertProviderApproved } from "./approval.server";

describe("production provider approval", () => {
  it("normalizes and deduplicates the allowlist", () => {
    expect(
      approvedProviderSlugs({
        PARKPUNKT_ENABLED_PROVIDER_SLUGS: " datex-berlin,opendata-hamburg,datex-berlin ",
      }),
    ).toEqual(["datex-berlin", "opendata-hamburg"]);
  });

  it("rejects malformed slugs", () => {
    expect(() =>
      approvedProviderSlugs({ PARKPUNKT_ENABLED_PROVIDER_SLUGS: "valid,../invalid" }),
    ).toThrow(/invalid provider slug/);
  });

  it("denies unapproved production sync but permits local testing", () => {
    expect(() => assertProviderApproved("apcoa", { APP_ENV: "production" })).toThrow(
      /not approved/,
    );
    expect(() => assertProviderApproved("apcoa", { APP_ENV: "development" })).not.toThrow();
  });
});
