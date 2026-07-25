import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useStore, haversineKm } from "@/lib/parkpunkt-data";
import { Boxes, Play, Radio } from "lucide-react";
import { RoleGate } from "@/components/RoleGate";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/provider")({
  head: () => ({
    meta: [
      { title: "ParkPunkt Provider Hub" },
      { name: "description", content: "Query the ParkPunkt orchestration API and inspect provider inventory." },
      { property: "og:title", content: "ParkPunkt Provider Hub" },
      { property: "og:description", content: "Inventory, quotes, and API orchestration." },
    ],
  }),
  component: ProviderGated,
});

function ProviderGated() {
  return (
    <AppShell>
      <RoleGate allow={["provider", "admin"]}>
        <ProviderHub />
      </RoleGate>
    </AppShell>
  );
}

function ProviderHub() {
  const sites = useStore((s) => s.sites);
  const [lat, setLat] = useState(52.521);
  const [lng, setLng] = useState(13.413);
  const [max, setMax] = useState(5);
  const [duration, setDuration] = useState(120);
  const { t } = useI18n();

  const response = useMemo(() => {
    const filtered = sites
      .map((s) => ({ ...s, distance_km: +haversineKm({lat,lng}, s).toFixed(2), free: s.capacity - s.occupied }))
      .filter((s) => s.free > 0)
      .sort((a,b) => a.distance_km - b.distance_km)
      .slice(0, max)
      .map((s) => ({
        provider_id: s.id,
        name: s.name,
        operator: s.operator,
        price_per_hour: s.pricePerHour,
        quote_total: +((s.pricePerHour * duration / 60)).toFixed(2),
        currency: "EUR",
        distance_km: s.distance_km,
        availability: s.free,
        type: s.type,
        amenities: s.amenities,
      }));
    return { query: { lat, lng, duration_minutes: duration, max_results: max }, count: filtered.length, results: filtered };
  }, [sites, lat, lng, max, duration]);

  return (
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        <div><h1 className="text-2xl font-semibold tracking-tight">{t("prov.title")}</h1><p className="text-sm text-muted-foreground">{t("prov.sub")}</p></div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Radio className="h-4 w-4"/>POST /v1/orchestrate/quote</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Field label="lat"><Input type="number" step="0.001" value={lat} onChange={(e) => setLat(parseFloat(e.target.value)||0)}/></Field>
                <Field label="lng"><Input type="number" step="0.001" value={lng} onChange={(e) => setLng(parseFloat(e.target.value)||0)}/></Field>
                <Field label={t("prov.duration")}><Input type="number" value={duration} onChange={(e) => setDuration(parseInt(e.target.value)||0)}/></Field>
                <Field label={t("prov.max")}><Input type="number" value={max} onChange={(e) => setMax(parseInt(e.target.value)||0)}/></Field>
              </div>
              <Button className="w-full"><Play className="mr-2 h-4 w-4"/>{t("prov.run")}</Button>
              <pre className="max-h-96 overflow-auto rounded-md bg-primary/5 p-3 text-xs">{JSON.stringify(response, null, 2)}</pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Boxes className="h-4 w-4"/>{t("prov.inventory")}</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {sites.map((s) => (
                <div key={s.id} className="flex items-center justify-between rounded-md border border-border p-3">
                  <div><div className="font-medium">{s.name}</div><div className="text-xs text-muted-foreground">{s.operator} · {s.id}</div></div>
                  <div className="text-right text-sm"><div>{s.capacity - s.occupied} {t("common.free")}</div><div className="text-xs text-muted-foreground">€{s.pricePerHour.toFixed(2)}/h</div></div>
                  <Badge variant="outline" className="ml-3 capitalize">{s.type}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
  );
}
function Field({ label, children }: { label:string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label className="text-xs">{label}</Label>{children}</div>;
}