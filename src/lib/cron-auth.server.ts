import { timingSafeEqual } from "node:crypto";

/** Constant-time bearer-token check for internal cron endpoints. */
export function isAuthorizedCronRequest(request: Request): boolean {
  const secret = process.env["PARKPUNKT_CRON_SECRET"];
  if (!secret || secret.length < 32) return false;
  const header = request.headers.get("authorization") ?? "";
  if (!header.toLowerCase().startsWith("bearer ")) return false;
  const token = header.slice(7).trim();
  const a = Buffer.from(token);
  const b = Buffer.from(secret);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
