import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { store, useStore, euros } from "@/lib/parkpunkt-data";
import { Building2, Plus, TrendingUp, Users, Euro, Activity } from "lucide-react";
import { RoleGate } from "@/components/RoleGate";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/operator")({
  head: () => ({
    meta: [
      { title: "ParkPunkt Operator Dashboard" },
      { name: "description", content: "Manage sites, tariffs and live occupancy across your parking portfolio." },
      { property: "og:title", content: "ParkPunkt Operator" },
      { property: "og:description", content: "Sites, tariffs, occupancy — one dashboard." },
    ],
  }),
  component: OperatorGated,
});

function OperatorGated() {
  return (
    <AppShell>
      <RoleGate allow={["operator", "admin"]}>
        <OperatorDashboard />
      </RoleGate>
    </AppShell>
  );
}

function OperatorDashboard() {
  const sites = useStore((s) => s.sites);
  const sessions = useStore((s) => s.sessions);
  const { t } = useI18n();
  const totals = useMemo(() => {
    const capacity = sites.reduce((a, s) => a + s.capacity, 0);
    const occupied = sites.reduce((a, s) => a + s.occupied, 0);
    const revenue = sessions.reduce((a, s) => a + s.amountCents, 0);
    return { capacity, occupied, revenue, pct: capacity ? Math.round((occupied/capacity)*100) : 0 };
  }, [sites, sessions]);

  return (
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><h1 className="text-2xl font-semibold tracking-tight">{t("op.title")}</h1><p className="text-sm text-muted-foreground">{t("op.sub")}</p></div>
          <AddSiteDialog />
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <KPI icon={<Building2 className="h-4 w-4"/>} label={t("op.kpi.sites")} value={String(sites.length)}/>
          <KPI icon={<Users className="h-4 w-4"/>} label={t("op.kpi.occupancy")} value={`${totals.pct}%`} sub={`${totals.occupied}/${totals.capacity}`}/>
          <KPI icon={<Activity className="h-4 w-4"/>} label={t("op.kpi.sessions")} value={String(sessions.length)}/>
          <KPI icon={<Euro className="h-4 w-4"/>} label={t("op.kpi.revenue")} value={euros(totals.revenue)}/>
        </div>

        <Card>
          <CardHeader><CardTitle>{t("op.sites")}</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="grid grid-cols-[1.5fr,1fr,1fr,1.2fr,120px,120px] gap-3 border-b border-border px-4 py-2 text-xs uppercase text-muted-foreground">
              <div>{t("op.col.site")}</div><div>{t("op.col.operator")}</div><div>{t("op.col.type")}</div><div>{t("op.col.occupancy")}</div><div>{t("op.col.rate")}</div><div className="text-right">{t("common.actions")}</div>
            </div>
            {sites.map((s) => <SiteRow key={s.id} id={s.id}/>)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="h-4 w-4"/>{t("op.recent")}</CardTitle></CardHeader>
          <CardContent>
            {sessions.length === 0 && <div className="text-sm text-muted-foreground">{t("op.recent.empty")}</div>}
            <div className="divide-y divide-border">
              {sessions.slice(0,10).map((x) => {
                const site = sites.find((y) => y.id === x.siteId);
                return (
                  <div key={x.id} className="grid grid-cols-[1fr,1fr,1fr,120px,120px] items-center gap-3 py-2 text-sm">
                    <div className="font-mono text-xs">{x.id}</div>
                    <div className="truncate">{site?.name}</div>
                    <div className="font-mono">{x.plate}</div>
                    <div>{euros(x.amountCents)}</div>
                    <div className="text-right"><Badge className={x.status === "active" ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"}>{x.status}</Badge></div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
  );
}

function KPI({ icon, label, value, sub }: { icon: React.ReactNode; label:string; value:string; sub?:string }) {
  return <Card><CardContent className="p-4"><div className="flex items-center gap-2 text-xs uppercase text-muted-foreground">{icon}{label}</div><div className="mt-1 text-2xl font-semibold">{value}</div>{sub && <div className="text-xs text-muted-foreground">{sub}</div>}</CardContent></Card>;
}

function SiteRow({ id }: { id: string }) {
  const site = useStore((s) => s.sites.find((x) => x.id === id))!;
  const pct = Math.round((site.occupied / site.capacity) * 100);
  const [rate, setRate] = useState(site.pricePerHour);
  return (
    <div className="grid grid-cols-[1.5fr,1fr,1fr,1.2fr,120px,120px] items-center gap-3 border-b border-border px-4 py-3 text-sm last:border-0">
      <div><div className="font-medium">{site.name}</div><div className="text-xs text-muted-foreground">{site.address}</div></div>
      <div>{site.operator}</div>
      <div><Badge variant="outline" className="capitalize">{site.type}</Badge></div>
      <div className="space-y-1"><Progress value={pct}/><div className="text-xs text-muted-foreground">{site.occupied}/{site.capacity} ({pct}%)</div></div>
      <div className="flex items-center gap-1"><span>€</span><Input type="number" step="0.1" value={rate} onChange={(e) => setRate(parseFloat(e.target.value)||0)} onBlur={() => store.updateSite(site.id, { pricePerHour: rate })} className="h-8"/></div>
      <div className="flex justify-end gap-1">
        <Button size="sm" variant="secondary" onClick={() => store.updateSite(site.id, { occupied: Math.max(0, site.occupied - 1) })}>−</Button>
        <Button size="sm" variant="secondary" onClick={() => store.updateSite(site.id, { occupied: Math.min(site.capacity, site.occupied + 1) })}>+</Button>
      </div>
    </div>
  );
}

function AddSiteDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(""); const [addr, setAddr] = useState(""); const [cap, setCap] = useState(50); const [rate, setRate] = useState(2.5); const [op, setOp] = useState("Custom");
  const { t } = useI18n();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Plus className="mr-1 h-4 w-4"/>{t("op.addSite")}</Button></DialogTrigger>
      <DialogContent><DialogHeader><DialogTitle>{t("op.new")}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Field label={t("op.name")}><Input value={name} onChange={(e) => setName(e.target.value)}/></Field>
          <Field label={t("op.address")}><Input value={addr} onChange={(e) => setAddr(e.target.value)}/></Field>
          <div className="grid grid-cols-3 gap-2">
            <Field label={t("op.capacity")}><Input type="number" value={cap} onChange={(e) => setCap(parseInt(e.target.value)||0)}/></Field>
            <Field label={t("op.ratePerHour")}><Input type="number" step="0.1" value={rate} onChange={(e) => setRate(parseFloat(e.target.value)||0)}/></Field>
            <Field label={t("op.col.operator")}><Input value={op} onChange={(e) => setOp(e.target.value)}/></Field>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => {
            if (!name || !addr) return;
            store.addSite({ id: "S"+Math.random().toString(36).slice(2,6).toUpperCase(), name, address: addr, lat: 52.52, lng: 13.4, capacity: cap, occupied: 0, pricePerHour: rate, operator: op, amenities: [], type: "lot" });
            setOpen(false);
          }}>{t("common.create")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
function Field({ label, children }: { label:string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label>{label}</Label>{children}</div>;
}