import { isAuthorizedInternalRequest } from "./internal-auth.server";

/** Constant-time bearer-token check for internal cron endpoints. */
export function isAuthorizedCronRequest(request: Request): boolean {
  return isAuthorizedInternalRequest(request, "PARKPUNKT_CRON_SECRET");
}
