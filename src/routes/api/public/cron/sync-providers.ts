import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/cron/sync-providers")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = request.headers.get("authorization") ?? request.headers.get("apikey") ?? "";
        const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : auth.trim();
        const expected = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        if (!expected || token !== expected) {
          return json({ error: "Unauthorized" }, 401);
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { getAdapter } = await import("@/lib/providers/adapters");

        const { data: providers, error } = await supabaseAdmin
          .from("providers").select("*").eq("status", "active");
        if (error) return json({ error: error.message }, 500);

        const summary: Array<{ slug: string; created: number; updated: number; total: number; error?: string }> = [];

        for (const prov of providers ?? []) {
          const adapter = getAdapter(prov.slug);
          if (!adapter) { summary.push({ slug: prov.slug, created: 0, updated: 0, total: 0, error: "no adapter" }); continue; }
          try {
            const upstream = await adapter.listSites();
            let created = 0, updated = 0;
            for (const u of upstream) {
              const normalizedType: "street" | "garage" | "lot" =
                u.type === "on-street" || u.type === "street" ? "street"
                : u.type === "lot" ? "lot" : "garage";
              const address = u.address ?? u.name;
              const { data: existing } = await supabaseAdmin
                .from("site_provider_mapping").select("site_id")
                .eq("provider_id", prov.id).eq("external_site_id", u.external_id).maybeSingle();
              if (existing?.site_id) {
                await supabaseAdmin.from("sites").update({
                  name: u.name, address, lat: u.lat, lng: u.lng,
                  capacity: u.capacity, occupied: u.occupied ?? 0,
                  price_cents_per_hour: u.price_cents_per_hour, type: normalizedType, operator_name: u.operator_name,
                }).eq("id", existing.site_id);
                await supabaseAdmin.from("site_provider_mapping")
                  .update({ last_synced_at: new Date().toISOString() })
                  .eq("provider_id", prov.id).eq("external_site_id", u.external_id);
                updated++;
              } else {
                const { data: ns } = await supabaseAdmin.from("sites").insert({
                  name: u.name, address, lat: u.lat, lng: u.lng,
                  capacity: u.capacity, occupied: u.occupied ?? 0,
                  price_cents_per_hour: u.price_cents_per_hour, type: normalizedType, operator_name: u.operator_name,
                }).select().single();
                if (!ns) continue;
                await supabaseAdmin.from("site_provider_mapping").insert({
                  site_id: ns.id, provider_id: prov.id, external_site_id: u.external_id,
                  last_synced_at: new Date().toISOString(),
                });
                created++;
              }
            }
            summary.push({ slug: prov.slug, created, updated, total: upstream.length });
          } catch (e) {
            summary.push({ slug: prov.slug, created: 0, updated: 0, total: 0, error: (e as Error).message });
          }
        }

        // Prune request log > 7 days
        const cutoff = new Date(Date.now() - 7 * 86_400_000).toISOString();
        await supabaseAdmin.from("api_request_log").delete().lt("created_at", cutoff);

        return json({ ok: true, summary });
      },
    },
  },
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}