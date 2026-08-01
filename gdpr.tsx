import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  BadgeEuro,
  BriefcaseBusiness,
  Building2,
  Car,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Gauge,
  Mail,
  Plus,
  ReceiptText,
  ShieldCheck,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { euros, useMyPayments, useSessions } from "@/lib/parkpunkt-db";
import {
  useAddCostCentre,
  useAssignBusinessVehicle,
  useBusinessWorkspace,
  useCreateBusinessAccount,
  useVehicles,
} from "@/lib/product-db";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/fleet")({
  head: () => ({
    meta: [
      { title: "ParkPunkt Business & Fleet" },
      { name: "description", content: "Company parking, fleet policy and consolidated billing." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: FleetRoute,
});

function FleetRoute() {
  return (
    <AppShell>
      <FleetWorkspace />
    </AppShell>
  );
}

function FleetWorkspace() {
  const { lang } = useI18n();
  const { data, isLoading } = useBusinessWorkspace();
  const { data: vehicles = [] } = useVehicles();
  const { data: payments = [] } = useMyPayments();
  const { data: sessions = [] } = useSessions();
  const [accountId, setAccountId] = useState("");
  const accounts = data?.accounts ?? [];
  const account = accounts.find((item) => item.id === accountId) ?? accounts[0];
  const accountMembers = (data?.members ?? []).filter((item) => item.business_id === account?.id);
  const accountCentres = (data?.costCentres ?? []).filter(
    (item) => item.business_id === account?.id,
  );
  const accountVehicles = (data?.businessVehicles ?? []).filter(
    (item) => item.business_id === account?.id,
  );
  const paid = payments.filter((payment) => payment.status === "paid");
  const monthSpend = paid.reduce((sum, payment) => sum + payment.amount_cents, 0);
  const budget = account?.monthly_budget_cents ?? 0;
  const budgetPct = budget ? Math.min(100, Math.round((monthSpend / budget) * 100)) : 0;

  if (isLoading)
    return (
      <div className="mx-auto max-w-7xl p-6 text-sm text-muted-foreground">
        Loading business workspace…
      </div>
    );
  if (!account) return <EmptyBusiness />;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary">
            <BriefcaseBusiness className="h-3.5 w-3.5" />
            ParkPunkt Business
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">{account.name}</h1>
          <p className="text-sm text-muted-foreground">
            {lang === "de"
              ? "Firmenparkplätze, Fuhrparkregeln und Sammelabrechnung."
              : "Company parking, fleet policy and consolidated billing."}
          </p>
        </div>
        <div className="flex gap-2">
          {accounts.length > 1 && (
            <Select value={account.id} onValueChange={setAccountId}>
              <SelectTrigger className="w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((item) => (
                  <SelectItem value={item.id} key={item.id}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button variant="outline" onClick={() => downloadBusinessCsv(account.name, paid)}>
            <Download className="mr-1 h-4 w-4" />
            CSV / DATEV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <BusinessKpi
          icon={BadgeEuro}
          label={lang === "de" ? "Monatsausgaben" : "Month spend"}
          value={euros(monthSpend)}
        />
        <BusinessKpi
          icon={Users}
          label={lang === "de" ? "Mitglieder" : "Members"}
          value={String(accountMembers.length)}
        />
        <BusinessKpi
          icon={Car}
          label={lang === "de" ? "Flottenfahrzeuge" : "Fleet vehicles"}
          value={String(accountVehicles.length)}
        />
        <BusinessKpi
          icon={ReceiptText}
          label={lang === "de" ? "Belege" : "Receipts"}
          value={String(paid.length)}
        />
      </div>

      <Card className="rounded-3xl">
        <CardContent className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">
                {lang === "de" ? "Monatsbudget" : "Monthly budget"}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {budget
                  ? `${euros(monthSpend)} / ${euros(budget)}`
                  : lang === "de"
                    ? "Kein Budgetlimit konfiguriert"
                    : "No budget limit configured"}
              </div>
            </div>
            <Badge variant={budgetPct > 90 ? "destructive" : "outline"}>{budgetPct}%</Badge>
          </div>
          <Progress value={budgetPct} className="mt-4 h-2" />
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-3xl">
        <CardContent className="p-0">
          <Tabs defaultValue="vehicles">
            <div className="overflow-x-auto border-b border-border px-4 pt-3">
              <TabsList className="min-w-max bg-transparent p-0">
                <TabsTrigger value="vehicles" className="rounded-b-none px-4 py-3">
                  <Car className="mr-2 h-4 w-4" />
                  {lang === "de" ? "Fahrzeuge" : "Vehicles"}
                </TabsTrigger>
                <TabsTrigger value="centres" className="rounded-b-none px-4 py-3">
                  <Building2 className="mr-2 h-4 w-4" />
                  {lang === "de" ? "Kostenstellen" : "Cost centres"}
                </TabsTrigger>
                <TabsTrigger value="people" className="rounded-b-none px-4 py-3">
                  <Users className="mr-2 h-4 w-4" />
                  {lang === "de" ? "Team" : "Team"}
                </TabsTrigger>
                <TabsTrigger value="billing" className="rounded-b-none px-4 py-3">
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  {lang === "de" ? "Abrechnung" : "Billing"}
                </TabsTrigger>
                <TabsTrigger value="policy" className="rounded-b-none px-4 py-3">
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  {lang === "de" ? "Richtlinien" : "Policy"}
                </TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="vehicles" className="m-0 p-5">
              <VehicleAssignment
                accountId={account.id}
                vehicles={vehicles}
                assigned={accountVehicles}
                centres={accountCentres}
              />
            </TabsContent>
            <TabsContent value="centres" className="m-0 p-5">
              <CostCentres accountId={account.id} centres={accountCentres} />
            </TabsContent>
            <TabsContent value="people" className="m-0 p-5">
              <TeamPanel members={accountMembers} />
            </TabsContent>
            <TabsContent value="billing" className="m-0 p-5">
              <BillingPanel payments={paid} />
            </TabsContent>
            <TabsContent value="policy" className="m-0 p-5">
              <PolicyPanel account={account} sessions={sessions.length} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function EmptyBusiness() {
  const { lang } = useI18n();
  const create = useCreateBusinessAccount();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [vat, setVat] = useState("");
  return (
    <div className="mx-auto grid min-h-[65vh] max-w-3xl place-items-center px-4 py-10">
      <Card className="w-full overflow-hidden rounded-3xl">
        <div className="bg-gradient-to-br from-primary to-accent p-8 text-primary-foreground">
          <BriefcaseBusiness className="h-10 w-10" />
          <h1 className="mt-5 text-3xl font-semibold">ParkPunkt Business</h1>
          <p className="mt-2 max-w-xl text-primary-foreground/75">
            {lang === "de"
              ? "Ein Firmenkonto für Fahrer, Fahrzeuge, Kostenstellen und monatliche MwSt.-Rechnungen."
              : "One company workspace for drivers, vehicles, cost centres and monthly VAT billing."}
          </p>
        </div>
        <CardContent className="p-6">
          <div className="grid gap-3 sm:grid-cols-3">
            <MiniFeature
              icon={Users}
              text={lang === "de" ? "Fahrer & Rollen" : "Drivers & roles"}
            />
            <MiniFeature icon={Car} text={lang === "de" ? "Poolfahrzeuge" : "Pool vehicles"} />
            <MiniFeature
              icon={ReceiptText}
              text={lang === "de" ? "Sammelrechnung" : "Consolidated invoice"}
            />
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="mt-6 w-full">
                <Plus className="mr-2 h-4 w-4" />
                {lang === "de" ? "Firmenkonto erstellen" : "Create business account"}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {lang === "de" ? "Firmenkonto erstellen" : "Create business account"}
                </DialogTitle>
                <DialogDescription>
                  {lang === "de"
                    ? "Sie werden als Eigentümer und Administrator eingerichtet."
                    : "You will be set up as owner and administrator."}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <Field label={lang === "de" ? "Firmenname" : "Company name"}>
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
                </Field>
                <Field label={lang === "de" ? "Rechnungs-E-Mail" : "Billing email"}>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </Field>
                <Field label="VAT ID">
                  <Input value={vat} onChange={(e) => setVat(e.target.value.toUpperCase())} />
                </Field>
              </div>
              <DialogFooter>
                <Button
                  disabled={name.trim().length < 2 || create.isPending}
                  onClick={() =>
                    create.mutate(
                      { name, billingEmail: email, vatId: vat },
                      {
                        onSuccess: () => {
                          toast.success(
                            lang === "de" ? "Firmenkonto erstellt" : "Business account created",
                          );
                          setOpen(false);
                        },
                        onError: (error) => toast.error(error.message),
                      },
                    )
                  }
                >
                  {lang === "de" ? "Erstellen" : "Create"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
}

function VehicleAssignment({
  accountId,
  vehicles,
  assigned,
  centres,
}: {
  accountId: string;
  vehicles: Array<{ id: string; registration: string; nickname: string | null }>;
  assigned: Array<{
    vehicle_id: string;
    cost_centre_id: string | null;
    monthly_limit_cents: number | null;
  }>;
  centres: Array<{ id: string; code: string; name: string }>;
}) {
  const { lang } = useI18n();
  const assign = useAssignBusinessVehicle();
  const [vehicleId, setVehicleId] = useState(vehicles[0]?.id ?? "");
  const [centreId, setCentreId] = useState("none");
  const [limit, setLimit] = useState("250");
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-secondary/20 p-4">
        <Field label={lang === "de" ? "Fahrzeug" : "Vehicle"}>
          <Select value={vehicleId} onValueChange={setVehicleId}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {vehicles.map((vehicle) => (
                <SelectItem key={vehicle.id} value={vehicle.id}>
                  {vehicle.registration}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label={lang === "de" ? "Kostenstelle" : "Cost centre"}>
          <Select value={centreId} onValueChange={setCentreId}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">—</SelectItem>
              {centres.map((centre) => (
                <SelectItem key={centre.id} value={centre.id}>
                  {centre.code} · {centre.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label={lang === "de" ? "Monatslimit €" : "Monthly limit €"}>
          <Input className="w-32" value={limit} onChange={(e) => setLimit(e.target.value)} />
        </Field>
        <Button
          disabled={!vehicleId || assign.isPending}
          onClick={() =>
            assign.mutate(
              {
                businessId: accountId,
                vehicleId,
                costCentreId: centreId === "none" ? null : centreId,
                monthlyLimitCents: Math.round(Number(limit) * 100),
              },
              {
                onSuccess: () =>
                  toast.success(lang === "de" ? "Fahrzeug zugeordnet" : "Vehicle assigned"),
                onError: (error) => toast.error(error.message),
              },
            )
          }
        >
          <Plus className="mr-1 h-4 w-4" />
          {lang === "de" ? "Zuordnen" : "Assign"}
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {assigned.map((item) => {
          const vehicle = vehicles.find((candidate) => candidate.id === item.vehicle_id);
          const centre = centres.find((candidate) => candidate.id === item.cost_centre_id);
          return (
            <Card key={item.vehicle_id} className="rounded-2xl">
              <CardContent className="p-4">
                <Car className="h-5 w-5 text-primary" />
                <div className="mt-3 font-mono font-semibold">
                  {vehicle?.registration ?? item.vehicle_id}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {centre
                    ? `${centre.code} · ${centre.name}`
                    : lang === "de"
                      ? "Keine Kostenstelle"
                      : "No cost centre"}
                </div>
                <div className="mt-3 border-t border-border pt-3 text-sm">
                  <span className="text-muted-foreground">
                    {lang === "de" ? "Limit" : "Limit"}:{" "}
                  </span>
                  {item.monthly_limit_cents ? euros(item.monthly_limit_cents) : "—"}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function CostCentres({
  accountId,
  centres,
}: {
  accountId: string;
  centres: Array<{ id: string; code: string; name: string; is_active: boolean }>;
}) {
  const { lang } = useI18n();
  const add = useAddCostCentre();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-2xl border border-border bg-secondary/20 p-4 sm:grid-cols-[150px,1fr,auto]">
        <Input
          placeholder="DE-BER-01"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
        />
        <Input
          placeholder={lang === "de" ? "Vertrieb Berlin" : "Berlin Sales"}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Button
          disabled={code.trim().length < 2 || name.trim().length < 2 || add.isPending}
          onClick={() =>
            add.mutate(
              { businessId: accountId, code, name },
              {
                onSuccess: () => {
                  toast.success(lang === "de" ? "Kostenstelle erstellt" : "Cost centre created");
                  setCode("");
                  setName("");
                },
                onError: (error) => toast.error(error.message),
              },
            )
          }
        >
          <Plus className="mr-1 h-4 w-4" />
          {lang === "de" ? "Hinzufügen" : "Add"}
        </Button>
      </div>
      <div className="divide-y divide-border rounded-xl border border-border">
        {centres.map((centre) => (
          <div key={centre.id} className="flex items-center justify-between p-3">
            <div>
              <div className="font-mono text-sm font-semibold">{centre.code}</div>
              <div className="text-xs text-muted-foreground">{centre.name}</div>
            </div>
            <Badge variant={centre.is_active ? "default" : "secondary"}>
              {centre.is_active ? "Active" : "Inactive"}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}

function TeamPanel({
  members,
}: {
  members: Array<{ user_id: string; member_role: string; spending_limit_cents: number | null }>;
}) {
  const { lang } = useI18n();
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">
            {lang === "de" ? "Mitglieder und Rollen" : "Members and roles"}
          </h3>
          <p className="text-xs text-muted-foreground">
            {lang === "de"
              ? "Eigentümer, Admin, Finanzen und Fahrer."
              : "Owner, admin, finance and driver permissions."}
          </p>
        </div>
        <Button variant="outline" disabled title="Invitation email adapter required">
          <Mail className="mr-1 h-4 w-4" />
          {lang === "de" ? "Einladen" : "Invite"}
        </Button>
      </div>
      <div className="divide-y divide-border rounded-xl border border-border">
        {members.map((member) => (
          <div key={member.user_id} className="flex items-center gap-3 p-3">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
              {member.user_id.slice(0, 2).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{member.user_id}</div>
              <div className="text-xs text-muted-foreground">
                {member.spending_limit_cents
                  ? `${euros(member.spending_limit_cents)} limit`
                  : "No individual limit"}
              </div>
            </div>
            <Badge variant="outline" className="capitalize">
              {member.member_role}
            </Badge>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {lang === "de"
          ? "E-Mail-Einladungen werden aktiviert, sobald der Benachrichtigungsanbieter konfiguriert ist."
          : "Email invitations activate when the notification provider is configured."}
      </p>
    </div>
  );
}

function BillingPanel({
  payments,
}: {
  payments: Array<{
    id: string;
    created_at: string;
    description: string | null;
    amount_cents: number;
    status: string;
  }>;
}) {
  const { lang } = useI18n();
  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <div>
          <h3 className="font-semibold">
            {lang === "de" ? "Transaktionen und MwSt.-Belege" : "Transactions and VAT receipts"}
          </h3>
          <p className="text-xs text-muted-foreground">
            {lang === "de"
              ? "Export bereit für DATEV, SAP und Buchhaltung."
              : "Export-ready for DATEV, SAP and accounting."}
          </p>
        </div>
        <Button variant="outline">
          <Download className="mr-1 h-4 w-4" />
          Export
        </Button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[600px] text-sm">
          <thead className="bg-secondary/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3">Date</th>
              <th>Description</th>
              <th>Status</th>
              <th className="text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {payments.map((payment) => (
              <tr key={payment.id}>
                <td className="p-3">{new Date(payment.created_at).toLocaleDateString()}</td>
                <td>{payment.description ?? "Parking"}</td>
                <td>
                  <Badge variant="outline">{payment.status}</Badge>
                </td>
                <td className="text-right font-medium">{euros(payment.amount_cents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PolicyPanel({
  account,
  sessions,
}: {
  account: {
    allowed_from: string | null;
    allowed_until: string | null;
    monthly_budget_cents: number | null;
    status: string;
  };
  sessions: number;
}) {
  const { lang } = useI18n();
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Policy
        title={lang === "de" ? "Arbeitszeiten" : "Parking hours"}
        value={
          account.allowed_from && account.allowed_until
            ? `${account.allowed_from}–${account.allowed_until}`
            : lang === "de"
              ? "Jederzeit erlaubt"
              : "Allowed at any time"
        }
      />
      <Policy
        title={lang === "de" ? "Monatsbudget" : "Monthly budget"}
        value={
          account.monthly_budget_cents
            ? euros(account.monthly_budget_cents)
            : lang === "de"
              ? "Kein Limit"
              : "No limit"
        }
      />
      <Policy title={lang === "de" ? "Konto-Status" : "Account status"} value={account.status} />
      <Policy
        title={lang === "de" ? "Erfasste Vorgänge" : "Recorded sessions"}
        value={String(sessions)}
      />
    </div>
  );
}
function Policy({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border p-4">
      <CheckCircle2 className="h-5 w-5 text-accent" />
      <div className="mt-3 text-sm font-semibold">{title}</div>
      <div className="mt-1 text-sm capitalize text-muted-foreground">{value}</div>
    </div>
  );
}
function BusinessKpi({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Gauge;
  label: string;
  value: string;
}) {
  return (
    <Card className="rounded-2xl">
      <CardContent className="p-4">
        <Icon className="h-4 w-4 text-primary" />
        <div className="mt-3 text-xl font-semibold sm:text-2xl">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}
function MiniFeature({ icon: Icon, text }: { icon: typeof Users; text: string }) {
  return (
    <div className="rounded-xl bg-secondary/60 p-3 text-center">
      <Icon className="mx-auto h-5 w-5 text-primary" />
      <div className="mt-2 text-xs font-medium">{text}</div>
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function downloadBusinessCsv(
  name: string,
  payments: Array<{
    id: string;
    created_at: string;
    description: string | null;
    amount_cents: number;
    status: string;
  }>,
) {
  const escape = (value: string) => `"${value.replaceAll('"', '""')}"`;
  const lines = [
    "id,date,description,status,amount_eur",
    ...payments.map((payment) =>
      [
        payment.id,
        payment.created_at,
        escape(payment.description ?? "Parking"),
        payment.status,
        (payment.amount_cents / 100).toFixed(2),
      ].join(","),
    ),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-parking.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
