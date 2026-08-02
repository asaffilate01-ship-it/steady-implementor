const SLUG = /^[a-z0-9-]{1,60}$/;

export function approvedProviderSlugs(env: Record<string, string | undefined> = process.env) {
  const values = (env.PARKPUNKT_ENABLED_PROVIDER_SLUGS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const unique = [...new Set(values)];
  if (unique.some((value) => !SLUG.test(value))) {
    throw new Error("PARKPUNKT_ENABLED_PROVIDER_SLUGS contains an invalid provider slug");
  }
  return unique;
}

export function isProductionRuntime(env: Record<string, string | undefined> = process.env) {
  return env.APP_ENV === "production" || env.NODE_ENV === "production";
}

/** Provider sync is deny-by-default in production, including manual admin sync. */
export function assertProviderApproved(
  slug: string,
  env: Record<string, string | undefined> = process.env,
) {
  if (!isProductionRuntime(env)) return;
  if (!approvedProviderSlugs(env).includes(slug)) {
    throw new Error(`Provider "${slug}" is not approved for production sync`);
  }
}
