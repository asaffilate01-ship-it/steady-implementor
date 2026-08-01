import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/cron/sync-providers")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = request.headers.get("authorization") ?? "";
        const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
        const expected = process.env.PARKPUNKT_CRON_SECRET;
        if (!expected || expected.length < 32 || token !== expected) {
          return json({ error: "Unauthorized" }, 401);
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { runProviderSync } = await import("@/lib/provider-sync.server");

        const { data: providers, error } = await supabaseAdmin
          .from("providers")
          .select("*")
          .eq("status", "active");
        if (error) return json({ error: error.message }, 500);

        const summary: Array<{
          slug: string;
          created: number;
          updated: number;
          total: number;
          error?: string;
        }> = [];
        for (const prov of providers ?? []) {
          try {
            const result = await runProviderSync(prov);
            summary.push({
              slug: result.provider,
              created: result.created,
              updated: result.updated,
              total: result.total,
            });
          } catch (e) {
            summary.push({
              slug: prov.slug,
              created: 0,
              updated: 0,
              total: 0,
              error: (e as Error).message,
            });
          }
        }

        // Prune request log > 7 days
        const cutoff = new Date(Date.now() - 7 * 86_400_000).toISOString();
        await supabaseAdmin.from("api_request_log").delete().lt("created_at", cutoff);
        await supabaseAdmin.from("api_rate_limit_buckets").delete().lt("bucket_start", cutoff);

        return json({ ok: true, summary });
      },
    },
  },
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
