import { createFileRoute } from "@tanstack/react-router";
import { isAuthorizedInternalRequest } from "@/lib/internal-auth.server";
import { buildLaunchReadiness } from "@/lib/operations-domain";

export const Route = createFileRoute("/api/public/readiness")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!isAuthorizedInternalRequest(request, "PARKPUNKT_READINESS_SECRET")) {
          return json({ error: "Unauthorized" }, 401);
        }
        const checkedAt = new Date().toISOString();
        const checks = buildLaunchReadiness(process.env);
        const missing = [
          "SUPABASE_URL",
          "SUPABASE_PUBLISHABLE_KEY",
          "SUPABASE_SERVICE_ROLE_KEY",
        ].filter((key) => !process.env[key]);
        if (missing.length > 0) {
          return json(
            {
              status: "not_ready",
              database: "not_checked",
              checks: checks.map(({ key, ready }) => ({ key, ready })),
              missing,
              checkedAt,
            },
            503,
          );
        }
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { error } = await supabaseAdmin.from("sites").select("id").limit(1);
          if (error) throw error;
          const ready = checks.every((check) => check.ready);
          return json(
            {
              status: ready ? "ready" : "not_ready",
              database: "ok",
              checks: checks.map(({ key, ready: checkReady }) => ({ key, ready: checkReady })),
              checkedAt,
            },
            ready ? 200 : 503,
          );
        } catch (error) {
          console.error(
            JSON.stringify({
              level: "error",
              event: "readiness.database_failed",
              error: error instanceof Error ? error.message : "Unknown error",
            }),
          );
          return json({ status: "not_ready", database: "unavailable", checkedAt }, 503);
        }
      },
    },
  },
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}
