import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  euros,
  haversineKm,
  useSites,
  useSessions,
  useMyProfile,
  useStartSession,
  useEndSession,
  useExtendSession,
  useMyPayments,
  useReservations,
  useCancelReservation,
  useRealtimeSync,
  type Site,
  type Session,
} from "@/lib/parkpunkt-db";
import { MapPin, Search, Zap, Clock, Car, ArrowLeft, CreditCard, CheckCircle2, Timer, Check, LogIn, Receipt, CalendarClock, X as XIcon, Navigation, Building2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";

export const Route = createFileRoute("/drive")({
  head: () => ({
    meta: [
      { title: "ParkPunkt — Finden. Parken. Bezahlen." },
      { name: "description", content: "Search parking, book instantly, and pay contactless with ParkPunkt." },
      { property: "og:title", content: "ParkPunkt — Finden. Parken. Bezahlen." },
      { property: "og:description", content: "Find. Park. Pay." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DriverApp,
});

type Screen =
  | { name: "search" }
  | { name: "results"; where: { lat: number; lng: number }; query: string }
  | { name: "detail"; siteId: string }
  | { name: "arrived" }
  | { name: "active"; sessionId: string };

const DESTINATIONS: Record<string, { lat: number; lng: number }> = {
  Alexanderplatz: { lat: 52.521, lng: 13.413 },
  Hauptbahnhof: { lat: 52.525, lng: 13.369 },
  Kreuzberg: { lat: 52.499, lng: 13.418 },
  "Prenzlauer Berg": { lat: 52.539, lng: 13.412 },
};

function DriverApp() {
  const [screen, setScreen] = useState<Screen>({ name: "search" });
  useRealtimeSync(["sites", "sessions", "payments", "reservations"]);
  const { data: allSessions = [] } = useSessions();
  const active = allSessions.filter((x) => x.status === "active");

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-4 py-6">
        <DriveStepper current={screen.name} />
        {screen.name === "search" && (
          <SearchScreen
            onSearch={(where, query) => setScreen({ name: "results", where, query })}
            onArrived={() => setScreen({ name: "arrived" })}
            activeSessions={active.length}
            activeSession={active[0]}
            openActive={(id) => setScreen({ name: "active", sessionId: id })}
          />
        )}
        {screen.name === "results" && (
          <ResultsScreen where={screen.where} query={screen.query} onBack={() => setScreen({ name: "search" })} onSelect={(id) => setScreen({ name: "detail", siteId: id })} />
        )}
        {screen.name === "detail" && <DetailScreen siteId={screen.siteId} onBack={() => setScreen({ name: "search" })} onBooked={(id) => setScreen({ name: "active", sessionId: id })} />}
        {screen.name === "arrived" && <ArrivedScreen onBack={() => setScreen({ name: "search" })} onBooked={(id) => setScreen({ name: "active", sessionId: id })} />}
        {screen.name === "active" && <ActiveScreen sessionId={screen.sessionId} onDone={() => setScreen({ name: "search" })} />}
      </div>
    </AppShell>
  );
}

function DriveStepper({ current }: { current: "search" | "results" | "detail" | "arrived" | "active" }) {
  const { t } = useI18n();
  const steps: { key: typeof current; label: string }[] = [
    { key: "search", label: t("home.how.find.title") },
    { key: "results", label: t("drive.search") },
    { key: "detail", label: t("home.how.park.title") },
    { key: "active", label: t("home.how.pay.title") },
  ];
  const idx = current === "arrived" ? 2 : steps.findIndex((s) => s.key === current);
  return (
    <ol className="mb-6 flex items-center gap-2 overflow-x-auto pb-1 text-xs">
      {steps.map((s, i) => {
        const done = i < idx;
        const active = i === idx;
        return (
          <li key={s.key} className="flex items-center gap-2">
            <span
              className={
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-medium transition-colors " +
                (active
                  ? "border-primary/50 bg-primary/10 text-foreground"
                  : done
                    ? "border-accent/40 bg-accent/10 text-accent"
                    : "border-border bg-secondary/40 text-muted-foreground")
              }
            >
              <span className="grid h-4 w-4 place-items-center rounded-full bg-background/70 text-[10px] font-semibold tabular-nums">
                {done ? <Check className="h-3 w-3" /> : i + 1}
              </span>
              <span className="whitespace-nowrap">{s.label}</span>
            </span>
            {i < steps.length - 1 && <span className="h-px w-4 bg-border" aria-hidden />}
          </li>
        );
      })}
      <li className="ml-auto whitespace-nowrap text-muted-foreground">{idx + 1} {t("step.of")} {steps.length}</li>
    </ol>
  );
}

function SearchScreen({ onSearch, onArrived, activeSessions, activeSession, openActive }: { onSearch: (where: { lat: number; lng: number }, q: string) => void; onArrived: () => void; activeSessions: number; activeSession?: Session; openActive: (id: string) => void }) {
  const [q, setQ] = useState("Alexanderplatz");
  const { data: profile } = useMyProfile();
  const plate = profile?.plate ?? "—";
  const active = activeSession;
  const { t } = useI18n();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("drive.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("drive.sub")}</p>
      </div>
      <button
        onClick={onArrived}
        className="group relative flex w-full items-center gap-4 overflow-hidden rounded-xl border border-accent/40 bg-gradient-to-br from-accent/10 via-accent/5 to-transparent p-5 text-left transition hover:border-accent hover:shadow-[var(--shadow-soft)]"
      >
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
          <Navigation className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <div className="text-base font-semibold">{t("drive.arrived.cta")}</div>
          <div className="text-xs text-muted-foreground">{t("drive.arrived.sub")}</div>
        </div>
        <Zap className="h-5 w-5 text-accent transition-transform group-hover:translate-x-1" />
      </button>
      {active && (
        <Card className="cursor-pointer border-accent/50 bg-accent/5" onClick={() => openActive(active.id)}>
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <Timer className="h-5 w-5 text-accent" />
              <div>
                <div className="font-medium">{t("drive.activeSession")} {active.id}</div>
                <div className="text-xs text-muted-foreground">{t("drive.tapManage")}</div>
              </div>
            </div>
            <Badge className="bg-accent text-accent-foreground">{t("session.live")}</Badge>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="space-y-2">
            <Label>{t("drive.dest")}</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" placeholder={t("drive.dest.placeholder")} />
              </div>
              <Button onClick={() => onSearch(DESTINATIONS[q] ?? DESTINATIONS["Alexanderplatz"], q)}>{t("drive.search")}</Button>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {Object.keys(DESTINATIONS).map((k) => (
                <button key={k} onClick={() => setQ(k)} className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:border-primary hover:text-foreground">
                  {k}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-2 text-sm">
            <div className="rounded-md bg-secondary p-3">
              <div className="text-xs text-muted-foreground">{t("drive.plate")}</div>
              <div className="font-medium">{plate}</div>
            </div>
            <div className="rounded-md bg-secondary p-3">
              <div className="text-xs text-muted-foreground">{t("drive.activeSessions")}</div>
              <div className="font-medium">{activeSessions}</div>
            </div>
          </div>
        </CardContent>
      </Card>
      <HistoryPanel />
    </div>
  );
}

function HistoryPanel() {
  const { t } = useI18n();
  const { data: payments = [] } = useMyPayments();
  const { data: reservations = [] } = useReservations();
  const { data: sites = [] } = useSites();
  const cancel = useCancelReservation();
  const upcoming = reservations.filter((r) => r.status === "confirmed" && new Date(r.ends_at).getTime() > Date.now());
  if (payments.length === 0 && upcoming.length === 0) return null;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {upcoming.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><CalendarClock className="h-4 w-4" />{t("drive.upcoming")}</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {upcoming.map((r) => {
              const site = sites.find((s) => s.id === r.site_id);
              return (
                <div key={r.id} className="flex items-center justify-between rounded-md border border-border p-2">
                  <div>
                    <div className="font-medium">{site?.name ?? r.site_id.slice(0,8)}</div>
                    <div className="text-xs text-muted-foreground">{new Date(r.starts_at).toLocaleString()} · <span className="font-mono">{r.plate}</span></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-medium">{euros(r.price_cents)}</div>
                    <Button size="sm" variant="ghost" onClick={() => cancel.mutate(r.id)}><XIcon className="h-3 w-3" /></Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
      {payments.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Receipt className="h-4 w-4" />{t("drive.history")}</CardTitle></CardHeader>
          <CardContent>
            <div className="divide-y divide-border text-sm">
              {payments.slice(0, 6).map((p) => {
                const site = sites.find((s) => s.id === p.site_id);
                return (
                  <div key={p.id} className="flex items-center justify-between py-2">
                    <div>
                      <div className="font-medium">{p.description ?? "Payment"}</div>
                      <div className="text-xs text-muted-foreground">{site?.name ?? "—"} · {new Date(p.created_at).toLocaleDateString()}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="capitalize">{p.method}</Badge>
                      <div className="font-medium">{euros(p.amount_cents)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ResultsScreen({ where, query, onBack, onSelect }: { where: { lat: number; lng: number }; query: string; onBack: () => void; onSelect: (id: string) => void }) {
  const { data: sites = [], isLoading } = useSites();
  const [sort, setSort] = useState("smart");
  const { t } = useI18n();
  const enriched = useMemo(
    () => sites.map((s) => ({ ...s, distanceKm: haversineKm(where, s), free: s.capacity - s.occupied })),
    [sites, where],
  );
  const sorted = useMemo(() => {
    const arr = [...enriched];
    if (sort === "price") arr.sort((a, b) => a.price_cents_per_hour - b.price_cents_per_hour);
    else if (sort === "distance") arr.sort((a, b) => a.distanceKm - b.distanceKm);
    else
      arr.sort(
        (a, b) =>
          a.distanceKm * 0.4 + (a.price_cents_per_hour / 100) * 0.4 + (a.free < 5 ? 5 : 0) -
          (b.distanceKm * 0.4 + (b.price_cents_per_hour / 100) * 0.4 + (b.free < 5 ? 5 : 0)),
      );
    return arr;
  }, [enriched, sort]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="mr-1 h-4 w-4" />{t("common.back")}
        </Button>
        <div>
          <div className="text-sm text-muted-foreground">{t("drive.resultsNear")}</div>
          <div className="font-medium">{query}</div>
        </div>
        <div className="ml-auto w-40">
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="smart">{t("drive.sort.smart")}</SelectItem>
              <SelectItem value="price">{t("drive.sort.price")}</SelectItem>
              <SelectItem value="distance">{t("drive.sort.distance")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid gap-3">
        {isLoading && <div className="text-sm text-muted-foreground">…</div>}
        {sorted.map((s) => (
          <ResultRow key={s.id} site={s} onSelect={() => onSelect(s.id)} />
        ))}
      </div>
    </div>
  );
}

function ResultRow({ site, onSelect }: { site: Site & { distanceKm: number; free: number }; onSelect: () => void }) {
  const { t } = useI18n();
  const pct = Math.round((site.occupied / site.capacity) * 100);
  const badge = site.free < 5 ? t("drive.badge.almost") : site.free < 20 ? t("drive.badge.limited") : t("drive.badge.available");
  const badgeCls = site.free < 5 ? "bg-destructive text-destructive-foreground" : site.free < 20 ? "bg-yellow-500/90 text-white" : "bg-accent text-accent-foreground";
  return (
    <Card className="cursor-pointer transition hover:shadow-[var(--shadow-soft)]" onClick={onSelect}>
      <CardContent className="flex items-center gap-4 p-4">
        <div className="grid h-12 w-12 place-items-center rounded-lg bg-primary/10 text-primary"><MapPin className="h-5 w-5" /></div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2"><div className="truncate font-medium">{site.name}</div><Badge className={badgeCls}>{badge}</Badge></div>
          <div className="truncate text-xs text-muted-foreground">{site.address} · {site.distanceKm.toFixed(1)} km · {site.operator_name ?? "—"}</div>
          <div className="mt-1 flex gap-1">{site.amenities.map((a) => <span key={a} className="rounded bg-secondary px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">{a}</span>)}</div>
        </div>
        <div className="text-right">
          <div className="text-lg font-semibold">{euros(site.price_cents_per_hour)}<span className="text-xs font-normal text-muted-foreground">/h</span></div>
          <div className="text-xs text-muted-foreground">{site.free} {t("common.free")} · {pct}% {t("common.full")}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function DetailScreen({ siteId, onBack, onBooked }: { siteId: string; onBack: () => void; onBooked: (id: string) => void }) {
  const { data: sites = [] } = useSites();
  const site = sites.find((x) => x.id === siteId);
  const { data: profile } = useMyProfile();
  const plate = profile?.plate ?? "";
  const pm = profile?.payment_method ?? "";
  const [minutes, setMinutes] = useState(60);
  const { t } = useI18n();
  const start = useStartSession();
  if (!site) return <div className="text-sm text-muted-foreground">…</div>;
  const total = (site.price_cents_per_hour * minutes) / 60 / 100;
  const signedIn = !!profile;

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="mr-1 h-4 w-4" />{t("drive.backResults")}</Button>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5 text-primary" />{site.name}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">{site.address} — {t("drive.operatedBy")} {site.operator_name ?? "—"}</div>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <Stat label={t("drive.capacity")} value={String(site.capacity)} />
            <Stat label={t("drive.freeNow")} value={String(site.capacity - site.occupied)} />
            <Stat label={t("drive.rate")} value={`${euros(site.price_cents_per_hour)}/h`} />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm"><Label>{t("drive.duration")}</Label><span className="font-medium">{minutes} min</span></div>
            <Slider min={15} max={480} step={15} value={[minutes]} onValueChange={(v) => setMinutes(v[0])} />
          </div>
          <div className="space-y-1 rounded-md border border-border p-3 text-sm">
            <Row label={t("drive.vehicle")} value={<span className="font-mono">{plate || "—"}</span>} />
            <Row label={t("drive.payment")} value={<span className="inline-flex items-center gap-1"><CreditCard className="h-3.5 w-3.5" />{pm || "—"}</span>} />
            <Row label={t("drive.total")} value={<span className="text-lg font-semibold">€{total.toFixed(2)}</span>} />
          </div>
          {signedIn ? (
            <Button
              className="w-full"
              size="lg"
              disabled={start.isPending || !plate}
              onClick={async () => {
                try {
                  const s = await start.mutateAsync({ site, minutes, plate: plate || "B-PP 0000", paymentMethod: pm || null });
                  onBooked(s.id);
                } catch (e) {
                  toast.error((e as Error).message);
                }
              }}
            >
              <Zap className="mr-2 h-4 w-4" />{t("drive.start")}
            </Button>
          ) : (
            <Button asChild className="w-full" size="lg">
              <Link to="/auth"><LogIn className="mr-2 h-4 w-4" />Sign in to book</Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ActiveScreen({ sessionId, onDone }: { sessionId: string; onDone: () => void }) {
  return <ActiveScreenInner sessionId={sessionId} onDone={onDone} />;
}

function ActiveScreenInner({ sessionId, onDone }: { sessionId: string; onDone: () => void }) {
  const { data: sessions = [] } = useSessions();
  const session = sessions.find((x) => x.id === sessionId);
  const { data: sites = [] } = useSites();
  const site = sites.find((x) => x.id === session?.site_id);
  const endM = useEndSession();
  const extend = useExtendSession();
  const { t } = useI18n();
  if (!session || !site) return <div>{t("drive.notFound")} <Button variant="link" onClick={onDone}>{t("drive.goBack")}</Button></div>;
  const active = session.status === "active";
  const remaining = Math.max(0, new Date(session.ends_at).getTime() - Date.now());
  const mm = Math.floor(remaining / 60000);
  return (
    <div className="space-y-4">
      <Card className={active ? "border-accent/60" : ""}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2"><Car className="h-5 w-5" />{session.id}</span>
            <Badge className={active ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"}>{active ? t("drive.status.active") : t("drive.status.ended")}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md bg-primary/5 p-4 text-center">
            <div className="text-xs uppercase text-muted-foreground">{active ? t("drive.timeRemaining") : t("drive.sessionEnded")}</div>
            <div className="mt-1 text-4xl font-semibold tabular-nums">{active ? `${mm} min` : euros(session.amount_cents)}</div>
            <div className="mt-1 text-xs text-muted-foreground">{site.name}</div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <Stat label={t("drive.plate")} value={session.plate} />
            <Stat label={t("drive.rate")} value={`${euros(session.price_cents_per_hour)}/h`} />
            <Stat label={t("drive.charged")} value={euros(session.amount_cents)} />
          </div>
          {active && (
            <div className="grid grid-cols-3 gap-2">
              <Button variant="secondary" onClick={() => extend.mutate({ session, minutes: 30 })}><Clock className="mr-1 h-4 w-4" />+30m</Button>
              <Button variant="secondary" onClick={() => extend.mutate({ session, minutes: 60 })}><Clock className="mr-1 h-4 w-4" />+60m</Button>
              <Button variant="destructive" onClick={() => endM.mutate(session.id)}>{t("drive.end")}</Button>
            </div>
          )}
          {!active && (
            <div className="rounded-md border border-border p-3 text-sm">
              <div className="flex items-center gap-2 text-accent"><CheckCircle2 className="h-4 w-4" />{t("drive.receipt")}</div>
            </div>
          )}
          <Button variant="ghost" className="w-full" onClick={onDone}>{t("drive.backSearch")}</Button>
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