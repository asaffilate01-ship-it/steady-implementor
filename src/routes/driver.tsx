import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { store, useStore, euros, haversineKm, type Site } from "@/lib/parkpunkt-data";
import { MapPin, Search, Zap, Clock, Car, ArrowLeft, CreditCard, CheckCircle2, Timer } from "lucide-react";

export const Route = createFileRoute("/driver")({
  head: () => ({
    meta: [
      { title: "ParkPunkt Driver — Finden. Parken. Bezahlen." },
      { name: "description", content: "Search parking, book instantly, and pay contactless with ParkPunkt." },
      { property: "og:title", content: "ParkPunkt Driver" },
      { property: "og:description", content: "Find. Park. Pay." },
    ],
  }),
  component: DriverApp,
});

type Screen = { name: "search" } | { name: "results"; where: {lat:number;lng:number}; query: string } | { name: "detail"; siteId: string } | { name: "active"; sessionId: string };

const DESTINATIONS: Record<string, {lat:number;lng:number}> = {
  "Alexanderplatz": { lat: 52.521, lng: 13.413 },
  "Hauptbahnhof": { lat: 52.525, lng: 13.369 },
  "Kreuzberg": { lat: 52.499, lng: 13.418 },
  "Prenzlauer Berg": { lat: 52.539, lng: 13.412 },
};

function DriverApp() {
  const [screen, setScreen] = useState<Screen>({ name: "search" });
  const sessions = useStore((s) => s.sessions.filter((x) => x.status === "active"));

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-4 py-6">
        {screen.name === "search" && <SearchScreen onSearch={(where, query) => setScreen({ name: "results", where, query })} activeSessions={sessions.length} openActive={(id) => setScreen({ name: "active", sessionId: id })} />}
        {screen.name === "results" && <ResultsScreen where={screen.where} query={screen.query} onBack={() => setScreen({ name: "search" })} onSelect={(id) => setScreen({ name: "detail", siteId: id })} />}
        {screen.name === "detail" && <DetailScreen siteId={screen.siteId} onBack={() => setScreen({ name: "search" })} onBooked={(id) => setScreen({ name: "active", sessionId: id })} />}
        {screen.name === "active" && <ActiveScreen sessionId={screen.sessionId} onDone={() => setScreen({ name: "search" })} />}
      </div>
    </AppShell>
  );
}

function SearchScreen({ onSearch, activeSessions, openActive }: { onSearch: (where:{lat:number;lng:number}, q:string)=>void; activeSessions: number; openActive: (id: string) => void }) {
  const [q, setQ] = useState("Alexanderplatz");
  const plate = useStore((s) => s.plate);
  const active = useStore((s) => s.sessions.find((x) => x.status === "active"));
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Where do you want to park?</h1>
        <p className="text-sm text-muted-foreground">Search a location — ParkPunkt orchestrates providers to give you the best option.</p>
      </div>
      {active && (
        <Card className="border-accent/50 bg-accent/5 cursor-pointer" onClick={() => openActive(active.id)}>
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3"><Timer className="h-5 w-5 text-accent" /><div><div className="font-medium">Active session {active.id}</div><div className="text-xs text-muted-foreground">Tap to manage</div></div></div>
            <Badge className="bg-accent text-accent-foreground">LIVE</Badge>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="space-y-2">
            <Label>Destination</Label>
            <div className="flex gap-2">
              <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" placeholder="Address, POI, or district" /></div>
              <Button onClick={() => onSearch(DESTINATIONS[q] ?? DESTINATIONS["Alexanderplatz"], q)}>Search</Button>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {Object.keys(DESTINATIONS).map((k) => (
                <button key={k} onClick={() => setQ(k)} className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:border-primary hover:text-foreground">{k}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-2 text-sm">
            <div className="rounded-md bg-secondary p-3"><div className="text-xs text-muted-foreground">Plate</div><div className="font-medium">{plate}</div></div>
            <div className="rounded-md bg-secondary p-3"><div className="text-xs text-muted-foreground">Active sessions</div><div className="font-medium">{activeSessions}</div></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ResultsScreen({ where, query, onBack, onSelect }: { where:{lat:number;lng:number}; query:string; onBack:()=>void; onSelect:(id:string)=>void }) {
  const sites = useStore((s) => s.sites);
  const [sort, setSort] = useState("smart");
  const enriched = useMemo(() => sites.map((s) => ({ ...s, distanceKm: haversineKm(where, s), free: s.capacity - s.occupied })), [sites, where]);
  const sorted = useMemo(() => {
    const arr = [...enriched];
    if (sort === "price") arr.sort((a,b) => a.pricePerHour - b.pricePerHour);
    else if (sort === "distance") arr.sort((a,b) => a.distanceKm - b.distanceKm);
    else arr.sort((a,b) => (a.distanceKm * 0.4 + a.pricePerHour * 0.4 + (a.free < 5 ? 5 : 0)) - (b.distanceKm * 0.4 + b.pricePerHour * 0.4 + (b.free < 5 ? 5 : 0)));
    return arr;
  }, [enriched, sort]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="mr-1 h-4 w-4"/>Back</Button>
        <div><div className="text-sm text-muted-foreground">Results near</div><div className="font-medium">{query}</div></div>
        <div className="ml-auto w-40"><Select value={sort} onValueChange={setSort}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="smart">Smart ranking</SelectItem><SelectItem value="price">Cheapest</SelectItem><SelectItem value="distance">Closest</SelectItem></SelectContent></Select></div>
      </div>
      <div className="grid gap-3">
        {sorted.map((s) => <ResultRow key={s.id} site={s} onSelect={() => onSelect(s.id)} />)}
      </div>
    </div>
  );
}

function ResultRow({ site, onSelect }: { site: Site & { distanceKm: number; free: number }; onSelect: () => void }) {
  const pct = Math.round((site.occupied / site.capacity) * 100);
  const badge = site.free < 5 ? "Almost full" : site.free < 20 ? "Limited" : "Available";
  const badgeCls = site.free < 5 ? "bg-destructive text-destructive-foreground" : site.free < 20 ? "bg-yellow-500/90 text-white" : "bg-accent text-accent-foreground";
  return (
    <Card className="cursor-pointer transition hover:shadow-[var(--shadow-soft)]" onClick={onSelect}>
      <CardContent className="flex items-center gap-4 p-4">
        <div className="grid h-12 w-12 place-items-center rounded-lg bg-primary/10 text-primary"><MapPin className="h-5 w-5"/></div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2"><div className="truncate font-medium">{site.name}</div><Badge className={badgeCls}>{badge}</Badge></div>
          <div className="truncate text-xs text-muted-foreground">{site.address} · {site.distanceKm.toFixed(1)} km · {site.operator}</div>
          <div className="mt-1 flex gap-1">{site.amenities.map((a) => <span key={a} className="rounded bg-secondary px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">{a}</span>)}</div>
        </div>
        <div className="text-right">
          <div className="text-lg font-semibold">€{site.pricePerHour.toFixed(2)}<span className="text-xs font-normal text-muted-foreground">/h</span></div>
          <div className="text-xs text-muted-foreground">{site.free} free · {pct}% full</div>
        </div>
      </CardContent>
    </Card>
  );
}

function DetailScreen({ siteId, onBack, onBooked }: { siteId: string; onBack:()=>void; onBooked:(id:string)=>void }) {
  const site = useStore((s) => s.sites.find((x) => x.id === siteId))!;
  const plate = useStore((s) => s.plate);
  const pm = useStore((s) => s.paymentMethod);
  const [minutes, setMinutes] = useState(60);
  const total = (site.pricePerHour * minutes / 60);

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="mr-1 h-4 w-4"/>Back to results</Button>
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5 text-primary"/>{site.name}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">{site.address} — operated by {site.operator}</div>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <Stat label="Capacity" value={String(site.capacity)}/>
            <Stat label="Free now" value={String(site.capacity - site.occupied)}/>
            <Stat label="Rate" value={`€${site.pricePerHour.toFixed(2)}/h`}/>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm"><Label>Duration</Label><span className="font-medium">{minutes} min</span></div>
            <Slider min={15} max={480} step={15} value={[minutes]} onValueChange={(v) => setMinutes(v[0])} />
          </div>
          <div className="rounded-md border border-border p-3 text-sm space-y-1">
            <Row label="Vehicle" value={<span className="font-mono">{plate}</span>}/>
            <Row label="Payment" value={<span className="inline-flex items-center gap-1"><CreditCard className="h-3.5 w-3.5"/>{pm}</span>}/>
            <Row label="Total" value={<span className="text-lg font-semibold">€{total.toFixed(2)}</span>}/>
          </div>
          <Button className="w-full" size="lg" onClick={() => { const s = store.startSession(site.id, minutes); onBooked(s.id); }}><Zap className="mr-2 h-4 w-4"/>Start parking session</Button>
        </CardContent>
      </Card>
    </div>
  );
}

function ActiveScreen({ sessionId, onDone }: { sessionId: string; onDone: () => void }) {
  const session = useStore((s) => s.sessions.find((x) => x.id === sessionId));
  const site = useStore((s) => s.sites.find((x) => x.id === session?.siteId));
  if (!session || !site) return <div>Session not found. <Button variant="link" onClick={onDone}>Go back</Button></div>;
  const active = session.status === "active";
  const remaining = Math.max(0, session.endsAt - Date.now());
  const mm = Math.floor(remaining / 60000);
  return (
    <div className="space-y-4">
      <Card className={active ? "border-accent/60" : ""}>
        <CardHeader><CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2"><Car className="h-5 w-5"/>{session.id}</span>
          <Badge className={active ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"}>{active ? "ACTIVE" : "ENDED"}</Badge>
        </CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md bg-primary/5 p-4 text-center">
            <div className="text-xs uppercase text-muted-foreground">{active ? "Time remaining" : "Session ended"}</div>
            <div className="mt-1 text-4xl font-semibold tabular-nums">{active ? `${mm} min` : euros(session.amountCents)}</div>
            <div className="mt-1 text-xs text-muted-foreground">{site.name}</div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <Stat label="Plate" value={session.plate}/>
            <Stat label="Rate" value={`€${session.pricePerHour.toFixed(2)}/h`}/>
            <Stat label="Charged" value={euros(session.amountCents)}/>
          </div>
          {active && (
            <div className="grid grid-cols-3 gap-2">
              <Button variant="secondary" onClick={() => store.extendSession(session.id, 30)}><Clock className="mr-1 h-4 w-4"/>+30m</Button>
              <Button variant="secondary" onClick={() => store.extendSession(session.id, 60)}><Clock className="mr-1 h-4 w-4"/>+60m</Button>
              <Button variant="destructive" onClick={() => store.endSession(session.id)}>End</Button>
            </div>
          )}
          {!active && (
            <div className="rounded-md border border-border p-3 text-sm">
              <div className="flex items-center gap-2 text-accent"><CheckCircle2 className="h-4 w-4"/>Receipt sent to your account.</div>
            </div>
          )}
          <Button variant="ghost" className="w-full" onClick={onDone}>Back to search</Button>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-md bg-secondary p-3"><div className="text-xs text-muted-foreground">{label}</div><div className="font-medium">{value}</div></div>;
}
function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="flex items-center justify-between"><span className="text-muted-foreground">{label}</span><span>{value}</span></div>;
}