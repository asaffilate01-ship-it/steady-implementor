const SAFE_REQUEST_ID = /^[A-Za-z0-9._-]{8,128}$/;

export function resolveRequestId(request: Request): string {
  const supplied = request.headers.get("x-request-id")?.trim();
  if (supplied && SAFE_REQUEST_ID.test(supplied)) return supplied;
  return crypto.randomUUID();
}

export function applySecurityHeaders(
  response: Response,
  request: Request,
  requestId: string,
  options: { production: boolean; supabaseUrl?: string },
): Response {
  const headers = new Headers(response.headers);
  headers.set("x-request-id", requestId);
  headers.set("x-content-type-options", "nosniff");
  headers.set("x-frame-options", "DENY");
  headers.set("referrer-policy", "strict-origin-when-cross-origin");
  headers.set("cross-origin-opener-policy", "same-origin-allow-popups");
  headers.set("cross-origin-resource-policy", "same-origin");
  headers.set(
    "permissions-policy",
    "camera=(self), geolocation=(self), microphone=(), payment=(self), usb=(), browsing-topics=()",
  );
  headers.set("content-security-policy", buildContentSecurityPolicy(options));
  if (options.production && new URL(request.url).protocol === "https:") {
    headers.set("strict-transport-security", "max-age=63072000; includeSubDomains; preload");
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function buildContentSecurityPolicy(options: { production: boolean; supabaseUrl?: string }) {
  const connect = new Set([
    "'self'",
    "https://api.stripe.com",
    "https://r.stripe.com",
    "https://m.stripe.network",
  ]);
  if (options.supabaseUrl) {
    try {
      const url = new URL(options.supabaseUrl);
      connect.add(url.origin);
      connect.add(`${url.protocol === "https:" ? "wss:" : "ws:"}//${url.host}`);
    } catch {
      // Invalid configuration is reported by readiness checks; never reflect it into a header.
    }
  }
  if (!options.production) {
    connect.add("ws:");
    connect.add("wss:");
  }
  const script = ["'self'", "'unsafe-inline'", "https://js.stripe.com"];
  if (!options.production) script.push("'unsafe-eval'");

  return [
    "default-src 'self'",
    `script-src ${script.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src ${[...connect].join(" ")}`,
    "frame-src https://js.stripe.com https://hooks.stripe.com",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(options.production ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}
