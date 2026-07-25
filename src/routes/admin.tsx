import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { store, useStore, euros } from "@/lib/parkpunkt-data";
import { Shield, Users, Euro, Building2, RefreshCcw } from "lucide-react";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "ParkPunkt Admin Console" },
      { name: "description", content: "Platform-wide oversight: operators, revenue, and driver identity." },
      { property: "og:title", content: "ParkPunkt Admin" },
      { property: "og:description", content: "Super-admin controls." },
    ],
  }),
  component: AdminConsole,
});

function AdminConsole() {
  const sites = useStore((s) => s.sites);
  const sessions = useStore((s) => s.sessions);
  const notices = useStore((s) => s.notices);
  const plate = useStore((s) => s.plate);
  const pm = useStore((s) => s.paymentMethod);

  const operators = useMemo(() => {
    const byOp = new Map<string, { sites: number; capacity: number; occupied: number; revenue: number }>();
    for (const s of sites) {
      const cur = byOp.get(s.operator) ?? { sites: 0, capacity: 0, occupied: 0, revenue: 0 };
      cur.sites++; cur.capacity += s.capacity; cur.occupied += s.occupied;
      byOp.set(s.operator, cur);
    }
    for (const x of sessions) {
      const site = sites.find((s) => s.id === x.siteId); if (!site) continue;
      const cur = byOp.get(site.operator)!; cur.revenue += x.amountCents;
    }
    return Array.from(byOp.entries()).map(([name, v]) => ({ name, ...v }));
  }, [sites, sessions]);

  const totalRevenue = sessions.reduce((a, s) => a + s.amountCents, 0);

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        <div className="flex items-end justify-between">
          <div><h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2"><Shield className="h-5 w-5 text-primary"/>Admin console</h1><p className="text-sm text-muted-foreground">Platform-wide oversight for ParkPunkt operations.</p></div>
          <Button variant="outline" onClick={() => { if (confirm("Reset all demo data?")) store.reset(); }}><RefreshCcw className="mr-1 h-4 w-4"/>Reset demo data</Button>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <KPI icon={<Building2 className="h-4 w-4"/>} label="Operators" value={String(operators.length)}/>
          <KPI icon={<Building2 className="h-4 w-4"/>} label="Sites" value={String(sites.length)}/>
          <KPI icon={<Users className="h-4 w-4"/>} label="Sessions" value={String(sessions.length)}/>
          <KPI icon={<Euro className="h-4 w-4"/>} label="GMV" value={euros(totalRevenue)}/>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Operators</CardTitle></CardHeader>
            <CardContent><div className="divide-y divide-border">
              {operators.map((o) => (
                <div key={o.name} className="grid grid-cols-[1fr,80px,120px,120px] items-center gap-3 py-2 text-sm">
                  <div className="font-medium">{o.name}</div>
                  <div>{o.sites} sites</div>
                  <div>{o.occupied}/{o.capacity}</div>
                  <div className="text-right">{euros(o.revenue)}</div>
                </div>
              ))}
            </div></CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Driver identity</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Field label="Default plate"><Input value={plate} onChange={(e) => store.setPlate(e.target.value)} className="font-mono"/></Field>
              <Field label="Payment method"><Input value={pm} onChange={(e) => store.setPaymentMethod(e.target.value)}/></Field>
              <div className="rounded-md bg-secondary p-3 text-xs text-muted-foreground">Identity, KYC and vehicle records are shared across Driver, Enforcement and Operator systems.</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle>All sessions</CardTitle></CardHeader>
          <CardContent>
            {sessions.length === 0 && <div className="text-sm text-muted-foreground">No sessions yet.</div>}
            <div className="divide-y divide-border">
              {sessions.map((x) => { const s = sites.find((y) => y.id === x.siteId); return (
                <div key={x.id} className="grid grid-cols-[1fr,1.5fr,1fr,120px,120px] items-center gap-3 py-2 text-sm">
                  <div className="font-mono text-xs">{x.id}</div>
                  <div className="truncate">{s?.name}</div>
                  <div className="font-mono">{x.plate}</div>
                  <div>{euros(x.amountCents)}</div>
                  <div className="text-right"><Badge className={x.status === "active" ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"}>{x.status}</Badge></div>
                </div>
              );})}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Enforcement notices</CardTitle></CardHeader>
          <CardContent>
            {notices.length === 0 && <div className="text-sm text-muted-foreground">No notices.</div>}
            <div className="divide-y divide-border">{notices.map((n) => { const s = sites.find((y) => y.id === n.siteId); return (
              <div key={n.id} className="grid grid-cols-[1fr,1fr,2fr,120px] items-center gap-3 py-2 text-sm">
                <div className="font-mono text-xs">{n.id}</div>
                <div className="font-mono">{n.plate}</div>
                <div className="truncate">{s?.name} — {n.reason}</div>
                <div className="text-right">{euros(n.amountCents)}</div>
              </div>
            );})}</div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

function KPI({ icon, label, value }: { icon: React.ReactNode; label:string; value:string }) {
  return <Card><CardContent className="p-4"><div className="flex items-center gap-2 text-xs uppercase text-muted-foreground">{icon}{label}</div><div className="mt-1 text-2xl font-semibold">{value}</div></CardContent></Card>;
}
function Field({ label, children }: { label:string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label>{label}</Label>{children}</div>;
}