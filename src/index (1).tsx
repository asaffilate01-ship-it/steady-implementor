import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/health")({
  server: {
    handlers: {
      GET: async () => {
        const checkedAt = new Date().toISOString();
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { error } = await supabaseAdmin.from("sites").select("id").limit(1);
          if (error) throw error;
          return json({ status: "ok", database: "ok", checkedAt });
        } catch (error) {
          console.error("[health] database check failed", (error as Error).message);
          return json({ status: "degraded", database: "unavailable", checkedAt }, 503);
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
