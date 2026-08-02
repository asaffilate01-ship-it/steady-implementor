import { describe, expect, it } from "vitest";
import {
  applySecurityHeaders,
  buildContentSecurityPolicy,
  resolveRequestId,
} from "./security-headers";

describe("security headers", () => {
  it("pins restrictive production directives and approved payment origins", () => {
    const policy = buildContentSecurityPolicy({
      production: true,
      supabaseUrl: "https://project.supabase.co",
    });
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain("https://js.stripe.com");
    expect(policy).toContain("wss://project.supabase.co");
    expect(policy).not.toContain("'unsafe-eval'");
  });

  it("rejects unsafe incoming request identifiers", () => {
    const trusted = new Request("https://parkpunkt.example", {
      headers: { "x-request-id": "edge-request_123" },
    });
    const unsafe = new Request("https://parkpunkt.example", {
      headers: { "x-request-id": "<script>" },
    });
    expect(resolveRequestId(trusted)).toBe("edge-request_123");
    expect(resolveRequestId(unsafe)).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("adds HSTS only to production HTTPS responses", () => {
    const request = new Request("https://parkpunkt.example/health");
    const response = applySecurityHeaders(new Response("ok"), request, "request-123", {
      production: true,
    });
    expect(response.headers.get("strict-transport-security")).toContain("includeSubDomains");
    expect(response.headers.get("x-request-id")).toBe("request-123");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  });
});
