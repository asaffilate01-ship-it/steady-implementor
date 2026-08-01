import { expect, test } from "@playwright/test";

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
});

test("the mobile authentication layout has no horizontal overflow", async ({ page }) => {
  await page.goto("/auth");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(overflow).toBe(false);
  await expect(page.getByRole("link", { name: "ParkPunkt" })).toBeVisible();
});
