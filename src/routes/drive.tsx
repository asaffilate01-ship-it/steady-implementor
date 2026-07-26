import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { MapPin, Search, Zap, Clock, Car, ArrowLeft, CreditCard, CheckCircle2, Timer, Check, LogIn, Receipt, CalendarClock, X as XIcon, Navigation, Building2, ScanLine, Camera, Upload, Ticket } from "lucide-react";
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
  | { name: "scan" }
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
            onScan={() => setScreen({ name: "scan" })}
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
        {screen.name === "scan" && <ScanTicketScreen onBack={() => setScreen({ name: "search" })} onBooked={(id) => setScreen({ name: "active", sessionId: id })} />}
        {screen.name === "active" && <ActiveScreen sessionId={screen.sessionId} onDone={() => setScreen({ name: "search" })} />}
      </div>
    </AppShell>
  );
}

function DriveStepper({ current }: { current: "search" | "results" | "detail" | "arrived" | "scan" | "active" }) {
  const { t } = useI18n();
  const steps: { key: typeof current; label: string }[] = [
    { key: "search", label: t("home.how.find.title") },
    { key: "results", label: t("drive.search") },
    { key: "detail", label: t("home.how.park.title") },
    { key: "active", label: t("home.how.pay.title") },
  ];
  const idx = current === "arrived" || current === "scan" ? 2 : steps.findIndex((s) => s.key === current);
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

function SearchScreen({ onSearch, onArrived, onScan, activeSessions, activeSession, openActive }: { onSearch: (where: { lat: number; lng: number }, q: string) => void; onArrived: () => void; onScan: () => void; activeSessions: number; activeSession?: Session; openActive: (id: string) => void }) {
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
      <button
        onClick={onScan}
        className="group relative flex w-full items-center gap-4 overflow-hidden rounded-xl border border-primary/40 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5 text-left transition hover:border-primary hover:shadow-[var(--shadow-soft)]"
      >
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
          <ScanLine className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <div className="text-base font-semibold">{t("drive.scan.cta")}</div>
          <div className="text-xs text-muted-foreground">{t("drive.scan.ctaSub")}</div>
        </div>
        <Ticket className="h-5 w-5 text-primary transition-transform group-hover:translate-x-1" />
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

// ---------------------------------------------------------------------------
// Scan machine ticket → pay via app instead of at the pay-station
// ---------------------------------------------------------------------------

type BarcodeDetectorLike = {
  detect: (source: CanvasImageSource | ImageBitmapSource) => Promise<Array<{ rawValue: string; format?: string }>>;
};

function ScanTicketScreen({ onBack, onBooked }: { onBack: () => void; onBooked: (id: string) => void }) {
  const { t } = useI18n();
  const { data: sites = [] } = useSites();
  const { data: profile } = useMyProfile();
  const start = useStartSession();

  const [supported, setSupported] = useState<boolean | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [permError, setPermError] = useState(false);
  const [ticketRef, setTicketRef] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState("");
  const [siteId, setSiteId] = useState<string | null>(null);
  const [minutes, setMinutes] = useState(60);
  const [plate, setPlate] = useState(profile?.plate ?? "");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const detectorRef = useRef<BarcodeDetectorLike | null>(null);

  useEffect(() => { if (profile?.plate) setPlate(profile.plate); }, [profile?.plate]);

  useEffect(() => {
    const w = window as unknown as { BarcodeDetector?: new (opts?: { formats?: string[] }) => BarcodeDetectorLike };
    setSupported(typeof w.BarcodeDetector === "function");
  }, []);

  const stopCamera = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraOn(false);
  };
  useEffect(() => () => stopCamera(), []);

  const startCamera = async () => {
    setPermError(false);
    try {
      const w = window as unknown as { BarcodeDetector?: new (opts?: { formats?: string[] }) => BarcodeDetectorLike };
      if (!w.BarcodeDetector) { setSupported(false); return; }
      detectorRef.current = new w.BarcodeDetector({ formats: ["code_128", "code_39", "ean_13", "qr_code", "pdf417", "itf"] });
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      setCameraOn(true);
      // Wait for video element to mount, then attach.
      setTimeout(async () => {
        const v = videoRef.current;
        if (!v) return;
        v.srcObject = stream;
        await v.play().catch(() => undefined);
        const tick = async () => {
          if (!detectorRef.current || !videoRef.current) return;
          try {
            const codes = await detectorRef.current.detect(videoRef.current);
            if (codes && codes[0]?.rawValue) {
              handleDetected(codes[0].rawValue);
              return;
            }
          } catch {
            // ignore per-frame errors
          }
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      }, 50);
    } catch {
      setPermError(true);
      setCameraOn(false);
    }
  };

  const handleDetected = (raw: string) => {
    stopCamera();
    const clean = raw.replace(/\s+/g, "").toUpperCase();
    const ref = `TKT-${clean.slice(-8) || clean}`;
    setTicketRef(ref);
    // Heuristic: try to auto-match a site by embedded PP-XXXX or numeric prefix.
    const zoneMatch = clean.match(/PP-?[A-Z0-9]{4}/);
    if (zoneMatch) {
      const target = zoneMatch[0].replace("-", "");
      const hit = sites.find((s) => `PP${s.id.slice(0, 4).toUpperCase()}` === target);
      if (hit) setSiteId(hit.id);
    }
    toast.success(t("drive.scan.detected"));
  };

  const handleFile = async (file: File) => {
    const w = window as unknown as { BarcodeDetector?: new (opts?: { formats?: string[] }) => BarcodeDetectorLike };
    if (!w.BarcodeDetector) { setSupported(false); return; }
    try {
      const det = new w.BarcodeDetector({ formats: ["code_128", "code_39", "ean_13", "qr_code", "pdf417", "itf"] });
      const bmp = await createImageBitmap(file);
      const codes = await det.detect(bmp);
      if (codes[0]?.rawValue) handleDetected(codes[0].rawValue);
      else toast.error(t("drive.scan.noMatch"));
    } catch {
      toast.error(t("drive.scan.noMatch"));
    }
  };

  const selectedSite = siteId ? sites.find((s) => s.id === siteId) ?? null : null;
  const amount = selectedSite ? Math.round((selectedSite.price_cents_per_hour * minutes) / 60) : 0;
  const feeCents = Math.round(amount * 0.05);
  const operatorNet = amount - feeCents;

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={() => { stopCamera(); onBack(); }}><ArrowLeft className="mr-1 h-4 w-4" />{t("common.back")}</Button>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ScanLine className="h-5 w-5 text-primary" />{t("drive.scan.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-sm text-muted-foreground">{t("drive.scan.sub")}</p>

          {!ticketRef && (
            <div className="space-y-3">
              {supported === false && (
                <div className="rounded-md border border-yellow-500/40 bg-yellow-500/10 p-3 text-xs text-yellow-700 dark:text-yellow-300">
                  {t("drive.scan.notSupported")}
                </div>
              )}
              {permError && (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
                  {t("drive.scan.permDenied")}
                </div>
              )}
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border border-border bg-black/90">
                {cameraOn ? (
                  <>
                    <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
                    <div className="pointer-events-none absolute inset-6 rounded-md border-2 border-accent/70" />
                    <div className="pointer-events-none absolute left-1/2 top-1/2 h-0.5 w-2/3 -translate-x-1/2 animate-pulse bg-accent" />
                  </>
                ) : (
                  <div className="grid h-full place-items-center text-xs text-white/60">
                    <div className="flex flex-col items-center gap-2">
                      <Camera className="h-8 w-8" />
                      <span>{t("drive.scan.start")}</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {cameraOn ? (
                  <Button variant="secondary" onClick={stopCamera}>{t("drive.scan.stop")}</Button>
                ) : (
                  <Button onClick={startCamera} disabled={supported === false}><Camera className="mr-1 h-4 w-4" />{t("drive.scan.start")}</Button>
                )}
                <label className="inline-flex cursor-pointer items-center justify-center rounded-md border border-border bg-secondary px-3 py-2 text-sm font-medium hover:bg-secondary/80">
                  <Upload className="mr-1 h-4 w-4" />{t("drive.scan.uploadPhoto")}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                </label>
              </div>
              <div className="space-y-2 rounded-md border border-dashed border-border p-3">
                <Label className="text-xs">{t("drive.scan.manual")}</Label>
                <div className="flex gap-2">
                  <Input value={manualCode} onChange={(e) => setManualCode(e.target.value)} placeholder={t("drive.scan.manualPlaceholder")} className="font-mono" />
                  <Button size="sm" variant="outline" disabled={!manualCode.trim()} onClick={() => handleDetected(manualCode.trim())}>{t("drive.scan.useManual")}</Button>
                </div>
              </div>
            </div>
          )}

          {ticketRef && (
            <div className="space-y-4">
              <div className="rounded-md border border-accent/40 bg-accent/5 p-3">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">{t("drive.scan.ticketRef")}</div>
                <div className="mt-1 font-mono text-lg font-semibold">{ticketRef}</div>
              </div>

              {!selectedSite && (
                <div className="space-y-2 rounded-md border border-border p-3">
                  <Label className="text-xs">{t("drive.scan.needSite")}</Label>
                  <Select value={siteId ?? ""} onValueChange={(v) => setSiteId(v)}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      {sites.filter((s) => s.type !== "street").map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name} · {s.operator_name ?? "—"}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {selectedSite && (
                <>
                  <div className="rounded-md border border-border p-3">
                    <div className="text-xs uppercase text-muted-foreground">{t("drive.arrived.provider")}</div>
                    <div className="mt-1 flex items-center gap-2 text-sm font-medium"><Building2 className="h-4 w-4 text-primary" />{selectedSite.operator_name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{selectedSite.name}</div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm"><Label>{t("drive.duration")}</Label><span className="font-medium">{minutes} min</span></div>
                    <Slider min={15} max={480} step={15} value={[minutes]} onValueChange={(v) => setMinutes(v[0])} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("drive.plate")}</Label>
                    <Input value={plate} onChange={(e) => setPlate(e.target.value.toUpperCase())} placeholder="B-PP 1234" className="font-mono uppercase" />
                  </div>
                  <div className="space-y-1 rounded-md border border-border p-3 text-sm">
                    <Row label={t("drive.rate")} value={`${euros(selectedSite.price_cents_per_hour)}/h`} />
                    <Row label={t("drive.arrived.operatorNet")} value={<span className="text-muted-foreground">{euros(operatorNet)}</span>} />
                    <Row label={t("drive.arrived.fee")} value={<span className="text-muted-foreground">{euros(feeCents)}</span>} />
                    <div className="my-1 h-px bg-border" />
                    <Row label={t("drive.total")} value={<span className="text-lg font-semibold">{euros(amount)}</span>} />
                  </div>
                  {profile ? (
                    <Button
                      className="w-full"
                      size="lg"
                      disabled={start.isPending || !plate.trim()}
                      onClick={async () => {
                        try {
                          const s = await start.mutateAsync({ site: selectedSite, minutes, plate: plate.trim(), paymentMethod: profile.payment_method ?? null });
                          toast.success(`${t("drive.scan.detected")} · ${ticketRef}`);
                          onBooked(s.id);
                        } catch (e) {
                          toast.error((e as Error).message);
                        }
                      }}
                    >
                      <CreditCard className="mr-2 h-4 w-4" />{t("drive.scan.pay")} · {euros(amount)}
                    </Button>
                  ) : (
                    <Button asChild className="w-full" size="lg">
                      <Link to="/auth"><LogIn className="mr-2 h-4 w-4" />Sign in to pay</Link>
                    </Button>
                  )}
                  <div className="text-center text-xs text-muted-foreground">{t("drive.scan.hint")}</div>
                </>
              )}

              <Button variant="ghost" size="sm" className="w-full" onClick={() => { setTicketRef(null); setSiteId(null); }}>
                <ScanLine className="mr-1 h-4 w-4" />{t("drive.scan.start")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ActiveScreen({ sessionId, onDone }: { sessionId: string; onDone: () => void }) {
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

function ArrivedScreen({ onBack, onBooked }: { onBack: () => void; onBooked: (id: string) => void }) {
  const { t } = useI18n();
  const { data: sites = [] } = useSites();
  const { data: profile } = useMyProfile();
  const start = useStartSession();
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [detecting, setDetecting] = useState(true);
  const [manual, setManual] = useState(false);
  const [street, setStreet] = useState("");
  const [code, setCode] = useState("");
  const [siteId, setSiteId] = useState<string | null>(null);
  const [minutes, setMinutes] = useState(60);
  const [plate, setPlate] = useState(profile?.plate ?? "");
  useEffect(() => { if (profile?.plate) setPlate(profile.plate); }, [profile?.plate]);

  // Detect location (fallback: Berlin center)
  useEffect(() => {
    if (!navigator.geolocation) {
      setCoords({ lat: 52.520, lng: 13.405 });
      setDetecting(false);
      return;
    }
    const timer = setTimeout(() => { setCoords({ lat: 52.520, lng: 13.405 }); setDetecting(false); }, 3000);
    navigator.geolocation.getCurrentPosition(
      (p) => { clearTimeout(timer); setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }); setDetecting(false); },
      () => { clearTimeout(timer); setCoords({ lat: 52.520, lng: 13.405 }); setDetecting(false); },
    );
  }, []);

  const zoneCode = (s: Site) => `PP-${s.id.slice(0, 4).toUpperCase()}`;

  const nearest = useMemo(() => {
    if (!coords || sites.length === 0) return null;
    return [...sites].sort((a, b) => haversineKm(coords, a) - haversineKm(coords, b))[0];
  }, [coords, sites]);

  const selectedSite = useMemo(() => {
    if (siteId) return sites.find((s) => s.id === siteId) ?? null;
    if (!manual) return nearest;
    const codeUp = code.trim().toUpperCase();
    const streetLc = street.trim().toLowerCase();
    const byCode = codeUp ? sites.find((s) => zoneCode(s) === codeUp) : null;
    if (byCode) return byCode;
    if (streetLc) return sites.find((s) => s.address.toLowerCase().includes(streetLc) || s.name.toLowerCase().includes(streetLc)) ?? null;
    return null;
  }, [manual, siteId, sites, nearest, code, street]);

  const amount = selectedSite ? Math.round((selectedSite.price_cents_per_hour * minutes) / 60) : 0;
  const feeCents = Math.round(amount * 0.05); // matches DB default; trigger recomputes exactly on insert
  const operatorNet = amount - feeCents;

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="mr-1 h-4 w-4" />{t("common.back")}</Button>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Navigation className="h-5 w-5 text-accent" />{t("drive.arrived.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-sm text-muted-foreground">{t("drive.arrived.sub")}</p>

          {detecting && (
            <div className="rounded-md border border-border bg-secondary/40 p-4 text-sm text-muted-foreground">
              {t("drive.arrived.detecting")}
            </div>
          )}

          {!detecting && !manual && nearest && (
            <div className="space-y-3 rounded-md border border-accent/40 bg-accent/5 p-4">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">{t("drive.arrived.confirm")}</div>
              <div className="text-lg font-semibold">{nearest.name}</div>
              <div className="text-sm text-muted-foreground">{nearest.address}</div>
              <div className="flex items-center gap-2 pt-1">
                <Badge variant="outline" className="font-mono text-xs">{t("drive.arrived.code")}: {zoneCode(nearest)}</Badge>
                <Badge className="bg-primary/10 text-primary" variant="outline"><Building2 className="mr-1 h-3 w-3" />{nearest.operator_name ?? "—"}</Badge>
              </div>
              <div className="flex gap-2 pt-2">
                <Button size="sm" className="flex-1" onClick={() => setSiteId(nearest.id)}><Check className="mr-1 h-4 w-4" />{t("drive.arrived.yes")}</Button>
                <Button size="sm" variant="outline" className="flex-1" onClick={() => setManual(true)}>{t("drive.arrived.no")}</Button>
              </div>
            </div>
          )}

          {manual && !siteId && (
            <div className="space-y-3 rounded-md border border-border p-4">
              <div className="space-y-1.5">
                <Label>{t("drive.arrived.manual.street")}</Label>
                <Input value={street} onChange={(e) => setStreet(e.target.value)} placeholder="Alexanderplatz 1" />
              </div>
              <div className="space-y-1.5">
                <Label>{t("drive.arrived.manual.code")}</Label>
                <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="PP-XXXX" className="font-mono" />
              </div>
              {selectedSite ? (
                <div className="rounded-md bg-accent/10 p-2 text-xs text-accent">
                  ✓ {selectedSite.name} — {selectedSite.address}
                </div>
              ) : (street || code) ? (
                <div className="text-xs text-muted-foreground">{t("drive.arrived.nomatch")}</div>
              ) : null}
              {selectedSite && (
                <Button size="sm" className="w-full" onClick={() => setSiteId(selectedSite.id)}><Check className="mr-1 h-4 w-4" />{t("drive.arrived.yes")}</Button>
              )}
            </div>
          )}

          {siteId && selectedSite && (
            <div className="space-y-4">
              <div className="rounded-md border border-border p-3">
                <div className="text-xs uppercase text-muted-foreground">{t("drive.arrived.provider")}</div>
                <div className="mt-1 flex items-center gap-2 text-sm font-medium"><Building2 className="h-4 w-4 text-primary" />{selectedSite.operator_name ?? "—"}</div>
                <div className="text-xs text-muted-foreground">{selectedSite.name} · <span className="font-mono">{zoneCode(selectedSite)}</span></div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm"><Label>{t("drive.duration")}</Label><span className="font-medium">{minutes} min</span></div>
                <Slider min={15} max={480} step={15} value={[minutes]} onValueChange={(v) => setMinutes(v[0])} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("drive.plate")}</Label>
                <Input value={plate} onChange={(e) => setPlate(e.target.value.toUpperCase())} placeholder="B-PP 1234" className="font-mono uppercase" />
              </div>
              <div className="space-y-1 rounded-md border border-border p-3 text-sm">
                <Row label={t("drive.rate")} value={`${euros(selectedSite.price_cents_per_hour)}/h`} />
                <Row label={t("drive.arrived.operatorNet")} value={<span className="text-muted-foreground">{euros(operatorNet)}</span>} />
                <Row label={t("drive.arrived.fee")} value={<span className="text-muted-foreground">{euros(feeCents)}</span>} />
                <div className="my-1 h-px bg-border" />
                <Row label={t("drive.total")} value={<span className="text-lg font-semibold">{euros(amount)}</span>} />
              </div>
              {profile ? (
                <Button
                  className="w-full"
                  size="lg"
                  disabled={start.isPending || !plate.trim()}
                  onClick={async () => {
                    try {
                      const s = await start.mutateAsync({ site: selectedSite, minutes, plate: plate.trim(), paymentMethod: profile.payment_method ?? null });
                      toast.success(t("drive.arrived.settled"));
                      onBooked(s.id);
                    } catch (e) {
                      toast.error((e as Error).message);
                    }
                  }}
                >
                  <CreditCard className="mr-2 h-4 w-4" />{t("drive.arrived.pay")} · {euros(amount)}
                </Button>
              ) : (
                <Button asChild className="w-full" size="lg">
                  <Link to="/auth"><LogIn className="mr-2 h-4 w-4" />Sign in to pay</Link>
                </Button>
              )}
              <div className="text-center text-xs text-muted-foreground">{t("drive.arrived.settled")}</div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}