import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { haversineKm, useSites, useRealtimeSync } from "@/lib/parkpunkt-db";
import { useMyApiKeys, useApiRequestLog, useProviders } from "@/lib/providers-db";
import { createApiKeyFn, revokeApiKeyFn } from "@/lib/providers.functions";
import { Boxes, Play, Radio, KeyRound, Copy, Trash2, Loader2, Plug, Activity } from "lucide-react";
import { RoleGate } from "@/components/RoleGate";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/provider")({
  head: () => ({
    meta: [
      { title: "ParkPunkt Provider Hub" },
      {
        name: "description",
        content: "Query the ParkPunkt orchestration API and inspect provider inventory.",
      },
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
  useRealtimeSync(["sites"]);
  const { data: sites = [] } = useSites();
  const { t } = useI18n();
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("prov.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("prov.sub")}</p>
      </div>
      <Tabs defaultValue="orchestrate" className="space-y-4">
        <TabsList>
          <TabsTrigger value="orchestrate">
            <Radio className="mr-2 h-4 w-4" />
            {t("prov.tab.orch")}
          </TabsTrigger>
          <TabsTrigger value="keys">
            <KeyRound className="mr-2 h-4 w-4" />
            {t("prov.tab.keys")}
          </TabsTrigger>
          <TabsTrigger value="providers">
            <Plug className="mr-2 h-4 w-4" />
            {t("prov.tab.providers")}
          </TabsTrigger>
          <TabsTrigger value="logs">
            <Activity className="mr-2 h-4 w-4" />
            {t("prov.tab.logs")}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="orchestrate">
          <OrchestrateTab sites={sites} />
        </TabsContent>
        <TabsContent value="keys">
          <KeysTab />
        </TabsContent>
        <TabsContent value="providers">
          <ProvidersTab />
        </TabsContent>
        <TabsContent value="logs">
          <LogsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function OrchestrateTab({ sites }: { sites: import("@/lib/parkpunkt-db").Site[] }) {
  const { t } = useI18n();
  const { data: keys = [] } = useMyApiKeys();
  const activeKey = keys.find((k) => !k.revoked_at);
  const [lat, setLat] = useState(52.521);
  const [lng, setLng] = useState(13.413);
  const [max, setMax] = useState(5);
  const [duration, setDuration] = useState(120);
  const [live, setLive] = useState<{ status: number; body: unknown } | null>(null);
  const [rawKey, setRawKey] = useState<string>("");

  const preview = useMemo(() => {
    const filtered = sites
      .map((s) => ({
        ...s,
        distance_km: +haversineKm({ lat, lng }, s).toFixed(2),
        free: s.capacity - s.occupied,
      }))
      .filter((s) => s.free > 0)
      .sort((a, b) => a.distance_km - b.distance_km)
      .slice(0, max)
      .map((s) => ({
        site_id: s.id,
        name: s.name,
        address: s.address,
        operator: s.operator_name,
        distance_m: Math.round(s.distance_km * 1000),
        available: s.free,
        capacity: s.capacity,
        quote: {
          amount_cents: Math.round((s.price_cents_per_hour * duration) / 60),
          price_cents_per_hour: s.price_cents_per_hour,
          currency: "EUR",
        },
        type: s.type,
      }));
    return {
      query: { lat, lng, duration_minutes: duration, max_results: max, radius_m: 5000 },
      count: filtered.length,
      results: filtered,
    };
  }, [sites, lat, lng, max, duration]);

  async function runLive() {
    const key = rawKey || activeKey?.key_prefix; // prefix won't work; need full raw
    if (!rawKey) {
      toast.error(t("prov.needKey"));
      return;
    }
    try {
      const res = await fetch("/api/public/v1/orchestrate/quote", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${rawKey}` },
        body: JSON.stringify({ lat, lng, duration_minutes: duration, max_results: max }),
      });
      const body = await res.json();
      setLive({ status: res.status, body });
      if (!res.ok) toast.error(`${res.status}: ${(body as { error?: string })?.error ?? "error"}`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }
  const curl = `curl -X POST '${typeof window !== "undefined" ? window.location.origin : ""}/api/public/v1/orchestrate/quote' \\\n  -H 'authorization: Bearer YOUR_KEY' \\\n  -H 'content-type: application/json' \\\n  -d '${JSON.stringify({ lat, lng, duration_minutes: duration, max_results: max })}'`;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Radio className="h-4 w-4" />
            POST /api/public/v1/orchestrate/quote
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Field label="lat">
              <Input
                type="number"
                step="0.001"
                value={lat}
                onChange={(e) => setLat(parseFloat(e.target.value) || 0)}
              />
            </Field>
            <Field label="lng">
              <Input
                type="number"
                step="0.001"
                value={lng}
                onChange={(e) => setLng(parseFloat(e.target.value) || 0)}
              />
            </Field>
            <Field label={t("prov.duration")}>
              <Input
                type="number"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value) || 0)}
              />
            </Field>
            <Field label={t("prov.max")}>
              <Input
                type="number"
                value={max}
                onChange={(e) => setMax(parseInt(e.target.value) || 0)}
              />
            </Field>
          </div>
          <Field label={t("prov.testKey")}>
            <Input
              placeholder="pk_…"
              value={rawKey}
              onChange={(e) => setRawKey(e.target.value.trim())}
            />
          </Field>
          <Button className="w-full" onClick={runLive}>
            <Play className="mr-2 h-4 w-4" />
            {t("prov.runLive")}
          </Button>
          <div>
            <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
              <span>{t("prov.curl")}</span>
              <button
                className="underline"
                onClick={() => {
                  navigator.clipboard.writeText(curl);
                  toast.success(t("prov.copied"));
                }}
              >
                {t("prov.copy")}
              </button>
            </div>
            <pre className="max-h-40 overflow-auto rounded-md bg-muted p-2 text-xs">{curl}</pre>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Boxes className="h-4 w-4" />
            {live ? `${t("prov.liveResp")} (HTTP ${live.status})` : t("prov.preview")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="max-h-[500px] overflow-auto rounded-md bg-muted p-3 text-xs">
            {JSON.stringify(live?.body ?? preview, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}

function KeysTab() {
  const { t } = useI18n();
  const { data: keys = [], refetch, isLoading } = useMyApiKeys();
  const create = useServerFn(createApiKeyFn);
  const revoke = useServerFn(revokeApiKeyFn);
  const [name, setName] = useState("");
  const [freshKey, setFreshKey] = useState<{ key: string; name: string } | null>(null);
  const qc = useQueryClient();
  const createM = useMutation({
    mutationFn: () => create({ data: { name } }),
    onSuccess: (r) => {
      setFreshKey({ key: r.key, name: r.name });
      setName("");
      qc.invalidateQueries({ queryKey: ["api_keys"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });
  const revokeM = useMutation({
    mutationFn: (id: string) => revoke({ data: { id } }),
    onSuccess: () => {
      toast.success(t("prov.revoked"));
      refetch();
    },
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-4 w-4" />
            {t("prov.newKey")}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Input
            placeholder={t("prov.keyName")}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Button disabled={!name || createM.isPending} onClick={() => createM.mutate()}>
            {createM.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t("prov.create")}
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t("prov.yourKeys")}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="text-sm text-muted-foreground">
              <Loader2 className="inline h-4 w-4 animate-spin" />
            </div>
          )}
          {!isLoading && keys.length === 0 && (
            <div className="text-sm text-muted-foreground">{t("prov.noKeys")}</div>
          )}
          <div className="divide-y divide-border">
            {keys.map((k) => (
              <div key={k.id} className="flex items-center justify-between py-3">
                <div>
                  <div className="font-medium">
                    {k.name}{" "}
                    {k.revoked_at && (
                      <Badge variant="destructive" className="ml-2">
                        {t("prov.revokedTag")}
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground font-mono">{k.key_prefix}…</div>
                  <div className="text-xs text-muted-foreground">
                    {t("prov.lastUsed")}:{" "}
                    {k.last_used_at ? new Date(k.last_used_at).toLocaleString() : "—"}
                  </div>
                </div>
                {!k.revoked_at && (
                  <Button size="sm" variant="outline" onClick={() => revokeM.mutate(k.id)}>
                    <Trash2 className="mr-1 h-3 w-3" />
                    {t("prov.revoke")}
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!freshKey} onOpenChange={(o) => !o && setFreshKey(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("prov.keyOnce")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t("prov.keyOnceDesc")}</p>
          <div className="flex items-center gap-2 rounded-md border bg-muted p-2 font-mono text-xs">
            <span className="flex-1 break-all">{freshKey?.key}</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                navigator.clipboard.writeText(freshKey?.key ?? "");
                toast.success(t("prov.copied"));
              }}
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProvidersTab() {
  const { t } = useI18n();
  const { data: providers = [] } = useProviders();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("prov.registered")}</CardTitle>
      </CardHeader>
      <CardContent>
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="py-2">{t("prov.pName")}</th>
              <th>{t("prov.pKind")}</th>
              <th>{t("prov.pStatus")}</th>
              <th>{t("prov.pBase")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {providers.map((p) => (
              <tr key={p.id}>
                <td className="py-2">
                  <div className="font-medium">{p.name}</div>
                  <div className="font-mono text-xs text-muted-foreground">{p.slug}</div>
                </td>
                <td>
                  <Badge variant="outline">{p.kind}</Badge>
                </td>
                <td>
                  <Badge
                    variant={
                      p.status === "active"
                        ? "default"
                        : p.status === "paused"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {p.status}
                  </Badge>
                </td>
                <td className="font-mono text-xs">{p.api_base_url ?? "—"}</td>
              </tr>
            ))}
            {providers.length === 0 && (
              <tr>
                <td colSpan={4} className="py-4 text-center text-sm text-muted-foreground">
                  {t("prov.noneReg")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function LogsTab() {
  const { t } = useI18n();
  const { data: log = [], isLoading } = useApiRequestLog(50);
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("prov.recentCalls")}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
        {!isLoading && log.length === 0 && (
          <div className="text-sm text-muted-foreground">{t("prov.noCalls")}</div>
        )}
        <table className="w-full text-sm">
          <tbody className="divide-y divide-border">
            {log.map((r) => (
              <tr key={r.id}>
                <td className="py-2 text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleTimeString()}
                </td>
                <td className="font-mono text-xs">{r.path}</td>
                <td>
                  <Badge
                    variant={
                      r.status < 300 ? "default" : r.status < 500 ? "secondary" : "destructive"
                    }
                  >
                    {r.status}
                  </Badge>
                </td>
                <td className="text-xs text-muted-foreground">{r.latency_ms}ms</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function _keep(_x: unknown) {
  /* silence tree-shake */
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
