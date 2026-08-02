import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("public legal and authentication pages remain usable", async ({ page }) => {
  await page.goto("/legal/privacy");
  await expect(page).toHaveTitle(/Privacy Policy/);
  await expect(page.getByRole("heading", { name: "Privacy Policy" })).toBeVisible();
  await expect(page.getByText("Your rights", { exact: true })).toBeVisible();

  await page.goto("/auth");
  await expect(page).toHaveTitle(/Sign in/);
  await expect(page.getByRole("textbox").first()).toBeVisible();
  await expect(page.getByRole("button", { name: /google/i })).toBeVisible();
});

test("trusted API routes reject unsigned requests", async ({ request }) => {
  const quote = await request.post("/api/public/v1/orchestrate/quote", {
    data: { lat: 52.52, lng: 13.405, duration_minutes: 60 },
  });
  expect(quote.status()).toBe(401);

  const cron = await request.post("/api/public/cron/sync-providers");
  expect(cron.status()).toBe(401);

  const notificationCron = await request.post("/api/public/cron/dispatch-notifications");
  expect(notificationCron.status()).toBe(401);

  const webhook = await request.post("/api/public/webhooks/stripe", { data: {} });
  expect(webhook.status()).toBe(400);

  const readiness = await request.get("/api/public/readiness");
  expect(readiness.status()).toBe(401);
});

test("liveness stays lightweight and responses include browser defenses", async ({ request }) => {
  const health = await request.get("/api/public/health", {
    headers: { "x-request-id": "playwright-health-123" },
  });
  expect(health.status()).toBe(200);
  expect(health.headers()["cache-control"]).toBe("no-store");
  expect(health.headers()["x-request-id"]).toBe("playwright-health-123");
  expect(health.headers()["x-content-type-options"]).toBe("nosniff");
  expect(health.headers()["x-frame-options"]).toBe("DENY");
  expect(health.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(await health.json()).toMatchObject({ status: "ok", service: "parkpunkt-web" });
});

test("the mobile authentication layout has no horizontal overflow", async ({ page }) => {
  await page.goto("/auth");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(overflow).toBe(false);
  await expect(page.getByRole("link", { name: "ParkPunkt" })).toBeVisible();
});

test("public launch pages have no serious automated accessibility violations", async ({ page }) => {
  for (const path of ["/", "/auth", "/legal/privacy"]) {
    await page.goto(path);
    await expect(page.locator("body")).toBeVisible();

    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    const blockingViolations = result.violations.filter(
      (violation) => violation.impact === "serious" || violation.impact === "critical",
    );
    expect(blockingViolations, `${path} accessibility violations`).toEqual([]);
  }
});
