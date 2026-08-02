import { timingSafeEqual } from "node:crypto";

/** Constant-time bearer-token check for non-public operational endpoints. */
export function isAuthorizedInternalRequest(request: Request, environmentKey: string): boolean {
  const secret = process.env[environmentKey];
  if (!secret || secret.length < 32) return false;
  const header = request.headers.get("authorization") ?? "";
  if (!header.toLowerCase().startsWith("bearer ")) return false;
  const token = header.slice(7).trim();
  const supplied = Buffer.from(token);
  const expected = Buffer.from(secret);
  if (supplied.length !== expected.length) return false;
  return timingSafeEqual(supplied, expected);
}
