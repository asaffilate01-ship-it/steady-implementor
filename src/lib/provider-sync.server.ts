import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Database } from "@/integrations/supabase/types";
import { getAdapter } from "@/lib/providers/adapters";
import { validateProviderSites } from "@/lib/providers/contract";
import { assertProviderApproved } from "@/lib/providers/approval.server";

type Provider = Database["public"]["Tables"]["providers"]["Row"];

export type ProviderSyncResult = {
  provider: string;
  created: number;
  updated: number;
  total: number;
  status: "healthy" | "degraded";
};

export async function runProviderSync(
  provider: Provider,
  actorUserId: string | null = null,
): Promise<ProviderSyncResult> {
  assertProviderApproved(provider.slug);
  const startedAt = new Date().toISOString();
  await supabaseAdmin
    .from("providers")
    .update({
      last_sync_started_at: startedAt,
      last_sync_status: "running",
      last_sync_error: null,
      last_sync_created: 0,
      last_sync_updated: 0,
    })
    .eq("id", provider.id);

  try {
    const adapter = getAdapter(provider.slug);
    if (!adapter) throw new Error(`No adapter is configured for slug "${provider.slug}"`);
    const upstream = validateProviderSites(provider.slug, await adapter.listSites());
    const orgCache = new Map<string, string>();

    const resolveOperatorOrg = async (name: string) => {
      const cached = orgCache.get(name);
      if (cached) return cached;
      const { data: existing, error: readError } = await supabaseAdmin
        .from("orgs")
        .select("id")
        .eq("kind", "operator")
        .eq("name", name)
        .maybeSingle();
      if (readError) throw new Error(readError.message);
      if (existing?.id) {
        orgCache.set(name, existing.id);
        return existing.id;
      }
      const { data: created, error: createError } = await supabaseAdmin
        .from("orgs")
        .insert({ name, kind: "operator" })
        .select("id")
        .single();
      if (createError) throw new Error(createError.message);
      orgCache.set(name, created.id);
      return created.id;
    };

    let created = 0;
    let updated = 0;
    for (const externalSite of upstream) {
      const orgId = await resolveOperatorOrg(externalSite.operator_name);
      const normalizedType: "street" | "garage" | "lot" =
        externalSite.type === "on-street" || externalSite.type === "street"
          ? "street"
          : externalSite.type === "lot"
            ? "lot"
            : "garage";
      const siteData = {
        org_id: orgId,
        inventory_source: provider.slug,
        name: externalSite.name,
        address: externalSite.address ?? externalSite.name,
        lat: externalSite.lat,
        lng: externalSite.lng,
        capacity: externalSite.capacity,
        occupied: externalSite.occupied ?? 0,
        price_cents_per_hour: externalSite.price_cents_per_hour,
        type: normalizedType,
        operator_name: externalSite.operator_name,
      };
      const { data: mapping, error: mappingReadError } = await supabaseAdmin
        .from("site_provider_mapping")
        .select("site_id")
        .eq("provider_id", provider.id)
        .eq("external_site_id", externalSite.external_id)
        .maybeSingle();
      if (mappingReadError) throw new Error(mappingReadError.message);

      if (mapping?.site_id) {
        const { error: siteError } = await supabaseAdmin
          .from("sites")
          .update(siteData)
          .eq("id", mapping.site_id);
        if (siteError) throw new Error(siteError.message);
        const { error: mappingError } = await supabaseAdmin
          .from("site_provider_mapping")
          .update({ last_synced_at: new Date().toISOString() })
          .eq("provider_id", provider.id)
          .eq("external_site_id", externalSite.external_id);
        if (mappingError) throw new Error(mappingError.message);
        updated += 1;
      } else {
        const { data: site, error: siteError } = await supabaseAdmin
          .from("sites")
          .insert(siteData)
          .select("id")
          .single();
        if (siteError) throw new Error(siteError.message);
        const { error: mappingError } = await supabaseAdmin.from("site_provider_mapping").insert({
          site_id: site.id,
          provider_id: provider.id,
          external_site_id: externalSite.external_id,
          last_synced_at: new Date().toISOString(),
        });
        if (mappingError) throw new Error(mappingError.message);
        created += 1;
      }
    }

    const status = upstream.length === 0 ? "degraded" : "healthy";
    const completedAt = new Date().toISOString();
    const { error: healthError } = await supabaseAdmin
      .from("providers")
      .update({
        status: "active",
        last_sync_completed_at: completedAt,
        last_sync_status: status,
        last_sync_error: upstream.length === 0 ? "Provider returned no sites" : null,
        last_sync_created: created,
        last_sync_updated: updated,
      })
      .eq("id", provider.id);
    if (healthError) throw new Error(healthError.message);
    await supabaseAdmin.from("audit_events").insert({
      actor_user_id: actorUserId,
      action: "provider.sync_completed",
      entity_type: "provider",
      entity_id: provider.id,
      metadata: { created, updated, total: upstream.length, status },
    });
    return { provider: provider.slug, created, updated, total: upstream.length, status };
  } catch (cause) {
    const message = (cause as Error).message.slice(0, 1000);
    await Promise.all([
      supabaseAdmin
        .from("providers")
        .update({
          last_sync_completed_at: new Date().toISOString(),
          last_sync_status: "failed",
          last_sync_error: message,
        })
        .eq("id", provider.id),
      supabaseAdmin.from("audit_events").insert({
        actor_user_id: actorUserId,
        action: "provider.sync_failed",
        entity_type: "provider",
        entity_id: provider.id,
        metadata: { error: message },
      }),
    ]);
    throw cause;
  }
}
