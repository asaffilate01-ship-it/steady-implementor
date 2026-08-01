import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  euros,
  useOperatorSites,
  useSessions,
  useUpdateSite,
  useAddSite,
  useMyPayments,
  usePayouts,
  useRealtimeSync,
  type Site,
} from "@/lib/parkpunkt-db";
import {
  Building2,
  Plus,
  TrendingUp,
  Users,
  Euro,
  Activity,
  BarChart3,
  Wallet,
  CreditCard,
  PiggyBank,
} from "lucide-react";
import { RoleGate } from "@/components/RoleGate";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/operator")({
  head: () => ({
    meta: [
      { title: "ParkPunkt Operator Dashboard" },
      {
        name: "description",
        content: "Manage sites, tariffs and live occupancy across your parking portfolio.",
      },
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
  useRealtimeSync(["sites", "sessions", "payments", "payouts"]);
  const { data: sites = [], isLoading: sitesLoading } = useOperatorSites();
  const { data: sessions = [] } = useSessions();
  const { data: payments = [] } = useMyPayments();
  const { data: payouts = [] } = usePayouts();
  const { t } = useI18n();
  const totals = useMemo(() => {
    const capacity = sites.reduce((a, s) => a + s.capacity, 0);
    const occupied = sites.reduce((a, s) => a + s.occupied, 0);
    const paid = payments.filter((p) => p.status === "paid");
    const gross = paid.reduce((a, p) => a + p.amount_cents, 0);
    const platformFee = paid.reduce((a, p) => a + p.platform_fee_cents, 0);
    const net = paid.reduce((a, p) => a + p.operator_net_cents, 0);
    return {
      capacity,
      occupied,
      gross,
      platformFee,
      net,
      pct: capacity ? Math.round((occupied / capacity) * 100) : 0,
    };
  }, [sites, payments]);

  // Group payments by day for last 14 days (gross + net).
  const revByDay = useMemo(() => {
    const days: { day: string; gross: number; net: number }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      days.push({ day: d.toISOString().slice(5, 10), gross: 0, net: 0 });
    }
    for (const p of payments) {
      if (p.status !== "paid") continue;
      const d = new Date(p.created_at);
      d.setHours(0, 0, 0, 0);
      const key = d.toISOString().slice(5, 10);
      const bucket = days.find((x) => x.day === key);
      if (bucket) {
        bucket.gross += p.amount_cents;
        bucket.net += p.operator_net_cents;
      }
    }
    return days;
  }, [payments]);
  const maxDay = Math.max(1, ...revByDay.map((d) => d.gross));

  const pendingPayout = useMemo(() => {
    const paidOut = payouts
      .filter((p) => p.status === "paid")
      .reduce((a, p) => a + p.total_net_cents, 0);
    return Math.max(0, totals.net - paidOut);
  }, [totals.net, payouts]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("op.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("op.sub")}</p>
        </div>
        <AddSiteDialog />
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KPI
          icon={<Building2 className="h-4 w-4" />}
          label={t("op.kpi.sites")}
          value={String(sites.length)}
        />
        <KPI
          icon={<Users className="h-4 w-4" />}
          label={t("op.kpi.occupancy")}
          value={`${totals.pct}%`}
          sub={`${totals.occupied}/${totals.capacity}`}
        />
        <KPI
          icon={<Activity className="h-4 w-4" />}
          label={t("op.kpi.sessions")}
          value={String(sessions.length)}
        />
        <KPI
          icon={<Wallet className="h-4 w-4" />}
          label={t("op.kpi.net")}
          value={euros(totals.net)}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              {t("op.revenue14")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-40 items-end gap-1">
              {revByDay.map((d) => (
                <div key={d.day} className="relative flex flex-1 flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t bg-primary/30"
                    style={{ height: `${(d.gross / maxDay) * 100}%` }}
                    title={`${d.day} gross: ${euros(d.gross)}`}
                  />
                  <div
                    className="absolute bottom-4 w-full rounded-t bg-primary transition-all hover:bg-primary/90"
                    style={{ height: `${(d.net / maxDay) * 100}%` }}
                    title={`${d.day} net: ${euros(d.net)}`}
                  />
                  <div className="text-[10px] text-muted-foreground">{d.day}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-sm bg-primary" /> {t("op.payout.net")}
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-sm bg-primary/30" />{" "}
                {t("op.payout.gross")}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PiggyBank className="h-4 w-4" />
              {t("op.payout.title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <div className="text-xs uppercase text-muted-foreground">{t("op.payout.gross")}</div>
              <div className="text-2xl font-semibold">{euros(totals.gross)}</div>
            </div>
            <div className="space-y-1">
              <div className="text-xs uppercase text-muted-foreground">{t("op.payout.fee")}</div>
              <div className="text-xl font-medium text-destructive">
                −{euros(totals.platformFee)}
              </div>
            </div>
            <div className="border-t border-border pt-3 space-y-1">
              <div className="text-xs uppercase text-muted-foreground">{t("op.payout.net")}</div>
              <div className="text-2xl font-semibold text-accent-foreground">
                {euros(totals.net)}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xs uppercase text-muted-foreground">
                {t("op.payout.pending")}
              </div>
              <div className="text-lg font-medium">{euros(pendingPayout)}</div>
            </div>
            <Button className="w-full" variant="outline" disabled={pendingPayout <= 0}>
              <CreditCard className="mr-2 h-4 w-4" />
              {t("op.payout.request")}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("op.sites")}</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <div className="grid min-w-[900px] grid-cols-[1.5fr,1fr,1fr,1.2fr,120px,120px] gap-3 border-b border-border px-4 py-2 text-xs uppercase text-muted-foreground">
            <div>{t("op.col.site")}</div>
            <div>{t("op.col.operator")}</div>
            <div>{t("op.col.type")}</div>
            <div>{t("op.col.occupancy")}</div>
            <div>{t("op.col.rate")}</div>
            <div className="text-right">{t("common.actions")}</div>
          </div>
          {sitesLoading && (
            <div className="p-5 text-sm text-muted-foreground">{t("common.loading")}</div>
          )}
          {sites.map((s) => (
            <SiteRow key={s.id} site={s} />
          ))}
          {!sitesLoading && sites.length === 0 && (
            <div className="p-5 text-sm text-muted-foreground">{t("adm.orgs.empty")}</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            {t("op.recent")}
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {sessions.length === 0 && (
            <div className="text-sm text-muted-foreground">{t("op.recent.empty")}</div>
          )}
          <div className="min-w-[640px] divide-y divide-border">
            {sessions.slice(0, 10).map((x) => {
              const site = sites.find((y) => y.id === x.site_id);
              return (
                <div
                  key={x.id}
                  className="grid grid-cols-[1fr,1fr,1fr,120px,120px] items-center gap-3 py-2 text-sm"
                >
                  <div className="font-mono text-xs">{x.id.slice(0, 8)}</div>
                  <div className="truncate">{site?.name}</div>
                  <div className="font-mono">{x.plate}</div>
                  <div>{euros(x.amount_cents)}</div>
                  <div className="text-right">
                    <Badge
                      className={
                        x.status === "active"
                          ? "bg-accent text-accent-foreground"
                          : "bg-muted text-muted-foreground"
                      }
                    >
                      {x.status}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function KPI({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs uppercase text-muted-foreground">
          {icon}
          {label}
        </div>
        <div className="mt-1 text-2xl font-semibold">{value}</div>
        {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  );
}

function SiteRow({ site }: { site: Site }) {
  const pct = site.capacity > 0 ? Math.round((site.occupied / site.capacity) * 100) : 0;
  const [rate, setRate] = useState(site.price_cents_per_hour / 100);
  const update = useUpdateSite();
  return (
    <div className="grid min-w-[900px] grid-cols-[1.5fr,1fr,1fr,1.2fr,120px,120px] items-center gap-3 border-b border-border px-4 py-3 text-sm last:border-0">
      <div>
        <div className="font-medium">{site.name}</div>
        <div className="text-xs text-muted-foreground">{site.address}</div>
      </div>
      <div>{site.operator_name ?? "—"}</div>
      <div>
        <Badge variant="outline" className="capitalize">
          {site.type}
        </Badge>
      </div>
      <div className="space-y-1">
        <Progress value={pct} />
        <div className="text-xs text-muted-foreground">
          {site.occupied}/{site.capacity} ({pct}%)
        </div>
      </div>
      <div className="flex items-center gap-1">
        <span>€</span>
        <Input
          type="number"
          step="0.1"
          min="0"
          value={rate}
          onChange={(e) => setRate(parseFloat(e.target.value) || 0)}
          onBlur={() =>
            update.mutate(
              { id: site.id, patch: { price_cents_per_hour: Math.round(rate * 100) } },
              { onError: (error) => toast.error(error.message) },
            )
          }
          className="h-8"
        />
      </div>
      <div className="flex justify-end gap-1">
        <Button
          aria-label={`Decrease occupancy at ${site.name}`}
          size="sm"
          variant="secondary"
          onClick={() =>
            update.mutate(
              { id: site.id, patch: { occupied: Math.max(0, site.occupied - 1) } },
              { onError: (error) => toast.error(error.message) },
            )
          }
        >
          −
        </Button>
        <Button
          aria-label={`Increase occupancy at ${site.name}`}
          size="sm"
          variant="secondary"
          onClick={() =>
            update.mutate(
              { id: site.id, patch: { occupied: Math.min(site.capacity, site.occupied + 1) } },
              { onError: (error) => toast.error(error.message) },
            )
          }
        >
          +
        </Button>
      </div>
    </div>
  );
}

function AddSiteDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [addr, setAddr] = useState("");
  const [cap, setCap] = useState(50);
  const [rate, setRate] = useState(2.5);
  const [op, setOp] = useState("Custom");
  const [lat, setLat] = useState(52.52);
  const [lng, setLng] = useState(13.405);
  const { t } = useI18n();
  const add = useAddSite();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-1 h-4 w-4" />
          {t("op.addSite")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("op.new")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Field label={t("op.name")}>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label={t("op.address")}>
            <Input value={addr} onChange={(e) => setAddr(e.target.value)} />
          </Field>
          <div className="grid gap-2 sm:grid-cols-3">
            <Field label={t("op.capacity")}>
              <Input
                type="number"
                value={cap}
                onChange={(e) => setCap(parseInt(e.target.value) || 0)}
              />
            </Field>
            <Field label={t("op.ratePerHour")}>
              <Input
                type="number"
                step="0.1"
                value={rate}
                onChange={(e) => setRate(parseFloat(e.target.value) || 0)}
              />
            </Field>
            <Field label={t("op.col.operator")}>
              <Input value={op} onChange={(e) => setOp(e.target.value)} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Latitude">
              <Input
                type="number"
                step="0.000001"
                value={lat}
                onChange={(e) => setLat(parseFloat(e.target.value) || 0)}
              />
            </Field>
            <Field label="Longitude">
              <Input
                type="number"
                step="0.000001"
                value={lng}
                onChange={(e) => setLng(parseFloat(e.target.value) || 0)}
              />
            </Field>
          </div>
        </div>
        <DialogFooter>
          <Button
            disabled={add.isPending}
            onClick={async () => {
              if (!name || !addr) return;
              try {
                await add.mutateAsync({
                  name,
                  address: addr,
                  lat,
                  lng,
                  capacity: cap,
                  price_cents_per_hour: Math.round(rate * 100),
                  operator_name: op,
                  amenities: [],
                  type: "lot",
                });
                toast.success(t("common.create"));
                setOpen(false);
              } catch (error) {
                toast.error((error as Error).message);
              }
            }}
          >
            {t("common.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
