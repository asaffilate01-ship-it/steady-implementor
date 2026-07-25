import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { store, useStore, euros } from "@/lib/parkpunkt-data";
import { Camera, CheckCircle2, AlertTriangle, FileWarning } from "lucide-react";
import { RoleGate } from "@/components/RoleGate";

export const Route = createFileRoute("/_authenticated/enforcement")({
  head: () => ({
    meta: [
      { title: "ParkPunkt Enforcement" },
      { name: "description", content: "ANPR plate checks and enforcement notice issuance for authorised officers." },
      { property: "og:title", content: "ParkPunkt Enforcement" },
      { property: "og:description", content: "Plate scan, verify, and issue notice." },
    ],
  }),
  component: EnforcementGated,
});

function EnforcementGated() {
  return (
    <AppShell>
      <RoleGate allow={["enforcement", "admin"]}>
        <EnforcementApp />
      </RoleGate>
    </AppShell>
  );
}

function EnforcementApp() {
  const [plate, setPlate] = useState("");
  const [siteId, setSiteId] = useState("S001");
  const [reason, setReason] = useState("No valid session");
  const [amount, setAmount] = useState(35);
  const [scan, setScan] = useState<{ status: "unknown" | "valid" | "invalid"; sessionId?: string } | null>(null);

  const sites = useStore((s) => s.sites);
  const sessions = useStore((s) => s.sessions);
  const notices = useStore((s) => s.notices);

  const currentSite = useMemo(() => sites.find((s) => s.id === siteId), [sites, siteId]);

  function runScan() {
    const p = plate.trim().toUpperCase();
    if (!p) return;
    const match = sessions.find((s) => s.plate.toUpperCase() === p && s.status === "active" && s.siteId === siteId && s.endsAt > Date.now());
    setScan(match ? { status: "valid", sessionId: match.id } : { status: "invalid" });
  }

  return (
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6">
        <div><h1 className="text-2xl font-semibold tracking-tight">Enforcement</h1><p className="text-sm text-muted-foreground">ANPR-assisted plate verification and notice issuance.</p></div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Camera className="h-4 w-4"/>Plate scanner</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Field label="Site">
                <Select value={siteId} onValueChange={setSiteId}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{sites.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select>
              </Field>
              <Field label="Plate (ANPR capture)">
                <div className="flex gap-2"><Input value={plate} onChange={(e) => setPlate(e.target.value)} placeholder="e.g. B-PP 2026" className="font-mono uppercase"/><Button onClick={runScan}>Scan</Button></div>
              </Field>
              {scan && (
                scan.status === "valid" ? (
                  <div className="flex items-center gap-2 rounded-md border border-accent/40 bg-accent/10 p-3 text-sm"><CheckCircle2 className="h-5 w-5 text-accent"/><div>Valid session <span className="font-mono">{scan.sessionId}</span> at {currentSite?.name}.</div></div>
                ) : (
                  <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm"><AlertTriangle className="h-5 w-5 text-destructive"/><div>No active session for this plate at {currentSite?.name}.</div></div>
                )
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><FileWarning className="h-4 w-4"/>Issue notice</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Field label="Reason"><Input value={reason} onChange={(e) => setReason(e.target.value)}/></Field>
              <Field label="Amount (€)"><Input type="number" value={amount} onChange={(e) => setAmount(parseFloat(e.target.value)||0)}/></Field>
              <Button variant="destructive" className="w-full" disabled={!plate || scan?.status === "valid"} onClick={() => { store.issueNotice(plate.toUpperCase(), siteId, reason, amount); setPlate(""); setScan(null); }}>
                Issue notice
              </Button>
              {scan?.status === "valid" && <p className="text-xs text-muted-foreground">Notice disabled — plate has a valid session.</p>}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Recent notices ({notices.length})</CardTitle></CardHeader>
          <CardContent>
            {notices.length === 0 && <div className="text-sm text-muted-foreground">No notices issued yet.</div>}
            <div className="divide-y divide-border">
              {notices.map((n) => {
                const s = sites.find((x) => x.id === n.siteId);
                return (
                  <div key={n.id} className="grid grid-cols-[1fr,1fr,2fr,120px,140px] items-center gap-3 py-2 text-sm">
                    <div className="font-mono text-xs">{n.id}</div>
                    <div className="font-mono">{n.plate}</div>
                    <div className="truncate">{s?.name} — {n.reason}</div>
                    <div>{euros(n.amountCents)}</div>
                    <div className="text-right"><Badge variant="outline">{new Date(n.createdAt).toLocaleTimeString()}</Badge></div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
  );
}
function Field({ label, children }: { label:string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label>{label}</Label>{children}</div>;
}