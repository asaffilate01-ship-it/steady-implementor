import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useI18n } from "@/lib/i18n";
import { euros } from "@/lib/parkpunkt-db";
import {
  useBusinessAccounts,
  useBusinessMembers,
  useCostCentres,
  useCreateBusinessAccount,
  useSaveCostCentre,
  useSaveVehicle,
  useVehicles,
  type BusinessMember,
  type CostCentre,
  type Vehicle,
} from "@/lib/product-db";
import { Building2, Car, Download, Gauge, Plus, Users } from "lucide-react";

export const Route = createFileRoute("/_authenticated/fleet")({
  head: () => ({
    meta: [
      { title: "ParkPunkt Business Fleet" },
      {
        name: "description",
        content: "Manage business vehicles, cost centres, members and parking controls.",
      },
    ],
  }),
  component: FleetPage,
});

function FleetPage() {
  const { lang } = useI18n();
  const L = (en: string, de: string) => (lang === "de" ? de : en);
  const { data: accounts = [] } = useBusinessAccounts();
  const { data: allCentres = [] } = useCostCentres();
  const { data: vehicles = [] } = useVehicles();
  const [accountId, setAccountId] = useState("");

  useEffect(() => {
    if (!accountId && accounts[0]) setAccountId(accounts[0].id);
    if (accountId && !accounts.some((account) => account.id === accountId)) {
      setAccountId(accounts[0]?.id ?? "");
    }
  }, [accountId, accounts]);

  const account = accounts.find((item) => item.id === accountId);
  const { data: members = [] } = useBusinessMembers(accountId || undefined);
  const centres = allCentres.filter((item) => item.account_id === accountId);
  const fleetVehicles = vehicles.filter((vehicle) => vehicle.business_account_id === accountId);
  const budgetAllocated = centres.reduce((sum, centre) => sum + centre.budget_cents, 0);
  const budgetPercent = account?.monthly_limit_cents
    ? Math.min(100, Math.round((budgetAllocated / account.monthly_limit_cents) * 100))
    : 0;

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <Badge variant="secondary">{L("Business mobility", "Geschäftsmobilität")}</Badge>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">
              {L("Fleet control centre", "Flottenzentrale")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {L(
                "Vehicles, cost centres and parking controls in one accountable workspace.",
                "Fahrzeuge, Kostenstellen und Parkregeln in einem nachvollziehbaren Arbeitsbereich.",
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {accounts.length > 0 && (
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger className="w-56" aria-label={L("Business account", "Firmenkonto")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button
              variant="outline"
              disabled={!account}
              onClick={() => account && exportFleetCsv(account.name, fleetVehicles, centres)}
            >
              <Download className="mr-2 h-4 w-4" />
              {L("Export fleet CSV", "Flotte als CSV exportieren")}
            </Button>
          </div>
        </div>

        {!account ? (
          <CreateAccountCard L={L} />
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Metric icon={<Building2 />} label={L("Account", "Konto")} value={account.name} />
              <Metric
                icon={<Car />}
                label={L("Fleet vehicles", "Flottenfahrzeuge")}
                value={String(fleetVehicles.length)}
              />
              <Metric
                icon={<Users />}
                label={L("Members", "Mitglieder")}
                value={String(members.length)}
              />
              <Metric
                icon={<Gauge />}
                label={L("Monthly limit", "Monatslimit")}
                value={
                  account.monthly_limit_cents > 0
                    ? euros(account.monthly_limit_cents)
                    : L("Unlimited", "Unbegrenzt")
                }
              />
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
              <VehicleAssignmentCard
                L={L}
                accountId={account.id}
                vehicles={vehicles}
                centres={centres}
              />
              <div className="space-y-6">
                <CostCentreCard
                  L={L}
                  accountId={account.id}
                  centres={centres}
                  budgetAllocated={budgetAllocated}
                  monthlyLimit={account.monthly_limit_cents}
                  budgetPercent={budgetPercent}
                />
                <MembersCard L={L} members={members} />
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

type Tr = (en: string, de: string) => string;

function CreateAccountCard({ L }: { L: Tr }) {
  const create = useCreateBusinessAccount();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [limit, setLimit] = useState("");
  return (
    <Card className="mx-auto max-w-3xl">
      <CardHeader>
        <CardTitle>
          {L("Create your business workspace", "Business-Arbeitsbereich erstellen")}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-3">
        <Field label={L("Company name", "Firmenname")}>
          <Input value={name} onChange={(event) => setName(event.target.value)} />
        </Field>
        <Field label={L("Billing email", "Abrechnungs-E-Mail")}>
          <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </Field>
        <Field label={L("Monthly limit (€)", "Monatslimit (€)")}>
          <Input
            inputMode="decimal"
            value={limit}
            onChange={(event) => setLimit(event.target.value)}
          />
        </Field>
        <Button
          className="sm:col-span-3"
          disabled={create.isPending || name.trim().length < 2}
          onClick={() =>
            create.mutate(
              {
                name: name.trim(),
                billing_email: email.trim() || undefined,
                monthly_limit_cents: Math.max(0, Math.round((Number(limit) || 0) * 100)),
              },
              {
                onSuccess: () =>
                  toast.success(L("Business account created", "Firmenkonto erstellt")),
                onError: (error) => toast.error(error.message),
              },
            )
          }
        >
          <Plus className="mr-2 h-4 w-4" />
          {L("Create business account", "Firmenkonto erstellen")}
        </Button>
      </CardContent>
    </Card>
  );
}

function VehicleAssignmentCard({
  L,
  accountId,
  vehicles,
  centres,
}: {
  L: Tr;
  accountId: string;
  vehicles: Vehicle[];
  centres: CostCentre[];
}) {
  const saveVehicle = useSaveVehicle();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{L("Vehicle assignment", "Fahrzeugzuordnung")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {vehicles.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {L(
              "Add a vehicle in the driver profile first.",
              "Fügen Sie zuerst ein Fahrzeug im Fahrerprofil hinzu.",
            )}
          </p>
        )}
        {vehicles.map((vehicle) => {
          const inFleet = vehicle.business_account_id === accountId;
          return (
            <div
              key={vehicle.id}
              className="grid gap-3 rounded-xl border border-border p-3 sm:grid-cols-[1fr_12rem] sm:items-center"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono font-semibold">{vehicle.plate}</span>
                  {inFleet && <Badge>{L("In fleet", "In Flotte")}</Badge>}
                  {vehicle.is_electric && <Badge variant="secondary">EV</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">{vehicle.label || vehicle.country}</p>
              </div>
              <Select
                value={inFleet ? (vehicle.cost_centre_id ?? "unassigned") : "personal"}
                onValueChange={(value) =>
                  saveVehicle.mutate(
                    {
                      id: vehicle.id,
                      plate: vehicle.plate,
                      country: vehicle.country,
                      business_account_id: value === "personal" ? null : accountId,
                      cost_centre_id: value === "personal" || value === "unassigned" ? null : value,
                    },
                    {
                      onSuccess: () =>
                        toast.success(
                          L("Vehicle assignment saved", "Fahrzeugzuordnung gespeichert"),
                        ),
                      onError: (error) => toast.error(error.message),
                    },
                  )
                }
              >
                <SelectTrigger aria-label={L("Cost centre assignment", "Kostenstellenzuordnung")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="personal">{L("Personal", "Privat")}</SelectItem>
                  <SelectItem value="unassigned">
                    {L("Fleet · no cost centre", "Flotte · ohne Kostenstelle")}
                  </SelectItem>
                  {centres.map((centre) => (
                    <SelectItem key={centre.id} value={centre.id}>
                      {centre.code} · {centre.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function CostCentreCard({
  L,
  accountId,
  centres,
  budgetAllocated,
  monthlyLimit,
  budgetPercent,
}: {
  L: Tr;
  accountId: string;
  centres: CostCentre[];
  budgetAllocated: number;
  monthlyLimit: number;
  budgetPercent: number;
}) {
  const save = useSaveCostCentre();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [budget, setBudget] = useState("");
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{L("Cost centres", "Kostenstellen")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {monthlyLimit > 0 && (
          <div>
            <div className="mb-1 flex justify-between text-xs text-muted-foreground">
              <span>{L("Allocated budgets", "Zugewiesene Budgets")}</span>
              <span>
                {euros(budgetAllocated)} / {euros(monthlyLimit)}
              </span>
            </div>
            <Progress value={budgetPercent} />
          </div>
        )}
        <div className="grid gap-2 sm:grid-cols-3">
          <Input
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder={L("Code", "Code")}
          />
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={L("Name", "Name")}
          />
          <Input
            inputMode="decimal"
            value={budget}
            onChange={(event) => setBudget(event.target.value)}
            placeholder={L("Budget €", "Budget €")}
          />
        </div>
        <Button
          variant="outline"
          disabled={save.isPending || !code.trim() || name.trim().length < 2}
          onClick={() =>
            save.mutate(
              {
                account_id: accountId,
                code: code.trim(),
                name: name.trim(),
                budget_cents: Math.max(0, Math.round((Number(budget) || 0) * 100)),
              },
              {
                onSuccess: () => {
                  setCode("");
                  setName("");
                  setBudget("");
                  toast.success(L("Cost centre saved", "Kostenstelle gespeichert"));
                },
                onError: (error) => toast.error(error.message),
              },
            )
          }
        >
          <Plus className="mr-2 h-4 w-4" /> {L("Save cost centre", "Kostenstelle speichern")}
        </Button>
        <div className="space-y-2">
          {centres.map((centre) => (
            <div
              key={centre.id}
              className="flex items-center justify-between rounded-lg bg-secondary/60 px-3 py-2 text-sm"
            >
              <span>
                <strong>{centre.code}</strong> · {centre.name}
              </span>
              <span className="text-muted-foreground">
                {centre.budget_cents ? euros(centre.budget_cents) : "—"}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function MembersCard({ L, members }: { L: Tr; members: BusinessMember[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{L("Account members", "Kontomitglieder")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {members.map((member) => (
          <div
            key={member.id}
            className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
          >
            <span className="font-mono text-xs">{member.user_id.slice(0, 8)}…</span>
            <Badge variant="outline" className="capitalize">
              {member.role}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary [&>svg]:h-5 [&>svg]:w-5">
          {icon}
        </span>
        <span className="min-w-0">
          <span className="block text-xs text-muted-foreground">{label}</span>
          <span className="block truncate font-semibold">{value}</span>
        </span>
      </CardContent>
    </Card>
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

function exportFleetCsv(accountName: string, vehicles: Vehicle[], centres: CostCentre[]) {
  const centreById = new Map(centres.map((centre) => [centre.id, centre]));
  const rows = [
    [
      "plate",
      "country",
      "label",
      "electric",
      "accessibility_permit",
      "cost_centre_code",
      "cost_centre_name",
    ],
    ...vehicles.map((vehicle) => {
      const centre = vehicle.cost_centre_id ? centreById.get(vehicle.cost_centre_id) : undefined;
      return [
        vehicle.plate,
        vehicle.country,
        vehicle.label ?? "",
        vehicle.is_electric,
        vehicle.accessibility_permit,
        centre?.code ?? "",
        centre?.name ?? "",
      ];
    }),
  ];
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${accountName.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "parkpunkt-fleet"}-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function csvCell(value: unknown) {
  return `"${String(value).replaceAll('"', '""')}"`;
}
