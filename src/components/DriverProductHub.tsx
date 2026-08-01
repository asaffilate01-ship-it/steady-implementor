import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Star, Car, Accessibility, LifeBuoy, QrCode, Building2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { euros, useSites } from "@/lib/parkpunkt-db";
import {
  useAccessPasses,
  useBusinessAccounts,
  useCostCentres,
  useCreateBusinessAccount,
  useCreateSupportCase,
  useDeleteVehicle,
  useDriverPreferences,
  useFavourites,
  useSaveCostCentre,
  useSavePreferences,
  useSaveVehicle,
  useSupportCases,
  useToggleFavourite,
  useVehicles,
} from "@/lib/product-db";

export function DriverProductHub() {
  const { lang } = useI18n();
  const L = (en: string, de: string) => (lang === "de" ? de : en);

  return (
    <Card className="border-border/60 bg-card/70 backdrop-blur">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{L("Your parking profile", "Ihr Parkprofil")}</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="vehicles">
          <TabsList className="flex w-full flex-wrap justify-start gap-1">
            <TabsTrigger value="vehicles" className="gap-1.5">
              <Car className="size-3.5" /> {L("Vehicles", "Fahrzeuge")}
            </TabsTrigger>
            <TabsTrigger value="favourites" className="gap-1.5">
              <Star className="size-3.5" /> {L("Favourites", "Favoriten")}
            </TabsTrigger>
            <TabsTrigger value="access" className="gap-1.5">
              <QrCode className="size-3.5" /> {L("Access", "Zugang")}
            </TabsTrigger>
            <TabsTrigger value="fleet" className="gap-1.5">
              <Building2 className="size-3.5" /> {L("Business", "Business")}
            </TabsTrigger>
            <TabsTrigger value="preferences" className="gap-1.5">
              <Accessibility className="size-3.5" /> {L("Preferences", "Einstellungen")}
            </TabsTrigger>
            <TabsTrigger value="support" className="gap-1.5">
              <LifeBuoy className="size-3.5" /> {L("Support", "Support")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="vehicles" className="pt-4">
            <VehiclesPanel L={L} />
          </TabsContent>
          <TabsContent value="favourites" className="pt-4">
            <FavouritesPanel L={L} />
          </TabsContent>
          <TabsContent value="access" className="pt-4">
            <AccessPanel L={L} />
          </TabsContent>
          <TabsContent value="fleet" className="pt-4">
            <FleetPanel L={L} />
          </TabsContent>
          <TabsContent value="preferences" className="pt-4">
            <PreferencesPanel L={L} />
          </TabsContent>
          <TabsContent value="support" className="pt-4">
            <SupportPanel L={L} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

type Tr = (en: string, de: string) => string;

function VehiclesPanel({ L }: { L: Tr }) {
  const { data: vehicles = [], isLoading } = useVehicles();
  const save = useSaveVehicle();
  const remove = useDeleteVehicle();
  const [plate, setPlate] = useState("");
  const [label, setLabel] = useState("");
  const [country, setCountry] = useState("DE");
  const [electric, setElectric] = useState(false);
  const [permit, setPermit] = useState(false);

  function add() {
    if (plate.trim().length < 2) {
      toast.error(L("Enter a registration plate", "Bitte Kennzeichen eingeben"));
      return;
    }
    save.mutate(
      {
        plate,
        country,
        label: label.trim() || null,
        is_electric: electric,
        accessibility_permit: permit,
        is_default: vehicles.length === 0,
      },
      {
        onSuccess: () => {
          setPlate("");
          setLabel("");
          setElectric(false);
          setPermit(false);
          toast.success(L("Vehicle saved", "Fahrzeug gespeichert"));
        },
        onError: (e) => toast.error((e as Error).message),
      },
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="space-y-1.5">
          <Label>{L("Plate", "Kennzeichen")}</Label>
          <Input value={plate} onChange={(e) => setPlate(e.target.value)} placeholder="B-PP 1234" />
        </div>
        <div className="space-y-1.5">
          <Label>{L("Country", "Land")}</Label>
          <Input
            value={country}
            onChange={(e) => setCountry(e.target.value.toUpperCase().slice(0, 3))}
          />
        </div>
        <div className="space-y-1.5">
          <Label>{L("Label", "Bezeichnung")}</Label>
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={L("Family car", "Familienauto")}
          />
        </div>
        <div className="flex items-end">
          <Button className="w-full" onClick={add} disabled={save.isPending}>
            {L("Add vehicle", "Fahrzeug hinzufügen")}
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={electric} onCheckedChange={setElectric} />
          {L("Electric vehicle", "Elektrofahrzeug")}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={permit} onCheckedChange={setPermit} />
          {L("Accessibility permit", "Schwerbehindertenausweis")}
        </label>
      </div>

      <div className="space-y-2">
        {isLoading && <p className="text-sm text-muted-foreground">{L("Loading…", "Lädt…")}</p>}
        {!isLoading && vehicles.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {L("No vehicles yet.", "Noch keine Fahrzeuge.")}
          </p>
        )}
        {vehicles.map((v) => (
          <div
            key={v.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/40 px-3 py-2"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono font-semibold">{v.plate}</span>
              <Badge variant="outline">{v.country}</Badge>
              {v.label && <span className="text-sm text-muted-foreground">{v.label}</span>}
              {v.is_default && <Badge>{L("Default", "Standard")}</Badge>}
              {v.is_electric && <Badge variant="secondary">EV</Badge>}
              {v.accessibility_permit && (
                <Badge variant="secondary">{L("Step-free", "Barrierefrei")}</Badge>
              )}
            </div>
            <div className="flex gap-2">
              {!v.is_default && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    save.mutate({ id: v.id, plate: v.plate, country: v.country, is_default: true })
                  }
                >
                  {L("Make default", "Als Standard")}
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => remove.mutate(v.id)}>
                {L("Remove", "Entfernen")}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FavouritesPanel({ L }: { L: Tr }) {
  const { data: favourites = [] } = useFavourites();
  const { data: sites = [] } = useSites();
  const toggle = useToggleFavourite();
  const favouriteIds = useMemo(() => new Set(favourites.map((f) => f.site_id)), [favourites]);

  return (
    <div className="space-y-2">
      {sites.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {L("No locations yet.", "Noch keine Standorte.")}
        </p>
      )}
      {sites.slice(0, 12).map((site) => {
        const isFavourite = favouriteIds.has(site.id);
        return (
          <div
            key={site.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/40 px-3 py-2"
          >
            <div>
              <p className="text-sm font-medium">{site.name}</p>
              <p className="text-xs text-muted-foreground">{site.address}</p>
            </div>
            <Button
              size="sm"
              variant={isFavourite ? "default" : "outline"}
              onClick={() => toggle.mutate({ siteId: site.id, favourite: !isFavourite })}
            >
              <Star className={`size-3.5 ${isFavourite ? "fill-current" : ""}`} />
              {isFavourite ? L("Saved", "Gespeichert") : L("Save", "Speichern")}
            </Button>
          </div>
        );
      })}
    </div>
  );
}

function AccessPanel({ L }: { L: Tr }) {
  const { data: passes = [] } = useAccessPasses();
  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        {L(
          "QR, ANPR and barrier passes are issued automatically when a session or reservation starts at an access-controlled site.",
          "QR-, ANPR- und Schranken-Pässe werden automatisch erzeugt, wenn eine Sitzung oder Reservierung an einem zugangskontrollierten Standort startet.",
        )}
      </p>
      {passes.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {L("No access passes yet.", "Noch keine Zugangspässe.")}
        </p>
      )}
      {passes.map((pass) => (
        <div
          key={pass.id}
          className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/40 px-3 py-2"
        >
          <div>
            <p className="font-mono text-sm font-semibold">{pass.code}</p>
            <p className="text-xs text-muted-foreground">
              {pass.kind.toUpperCase()} · {new Date(pass.expires_at).toLocaleString()}
            </p>
          </div>
          <Badge variant={pass.status === "active" ? "default" : "secondary"}>{pass.status}</Badge>
        </div>
      ))}
    </div>
  );
}

function FleetPanel({ L }: { L: Tr }) {
  const { data: accounts = [] } = useBusinessAccounts();
  const { data: centres = [] } = useCostCentres();
  const createAccount = useCreateBusinessAccount();
  const saveCentre = useSaveCostCentre();
  const [name, setName] = useState("");
  const [limit, setLimit] = useState("0");
  const [code, setCode] = useState("");
  const [centreName, setCentreName] = useState("");
  const account = accounts[0];

  return (
    <div className="space-y-4">
      {!account && (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>{L("Company name", "Firmenname")}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>{L("Monthly limit (€)", "Monatslimit (€)")}</Label>
            <Input value={limit} onChange={(e) => setLimit(e.target.value)} inputMode="numeric" />
          </div>
          <div className="flex items-end">
            <Button
              className="w-full"
              disabled={createAccount.isPending || name.trim().length < 2}
              onClick={() =>
                createAccount.mutate(
                  {
                    name: name.trim(),
                    monthly_limit_cents: Math.max(0, Math.round(Number(limit) || 0) * 100),
                  },
                  {
                    onSuccess: () =>
                      toast.success(L("Business account created", "Firmenkonto erstellt")),
                    onError: (e) => toast.error((e as Error).message),
                  },
                )
              }
            >
              {L("Create business account", "Firmenkonto erstellen")}
            </Button>
          </div>
        </div>
      )}

      {account && (
        <>
          <div className="rounded-lg border border-border/60 bg-background/40 px-3 py-2">
            <p className="text-sm font-medium">{account.name}</p>
            <p className="text-xs text-muted-foreground">
              {L("Monthly limit", "Monatslimit")}:{" "}
              {account.monthly_limit_cents > 0
                ? euros(account.monthly_limit_cents)
                : L("unlimited", "unbegrenzt")}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>{L("Cost centre code", "Kostenstelle")}</Label>
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="CC-100" />
            </div>
            <div className="space-y-1.5">
              <Label>{L("Name", "Name")}</Label>
              <Input value={centreName} onChange={(e) => setCentreName(e.target.value)} />
            </div>
            <div className="flex items-end">
              <Button
                className="w-full"
                variant="outline"
                disabled={!code.trim() || !centreName.trim()}
                onClick={() =>
                  saveCentre.mutate(
                    { account_id: account.id, code: code.trim(), name: centreName.trim() },
                    {
                      onSuccess: () => {
                        setCode("");
                        setCentreName("");
                        toast.success(L("Cost centre added", "Kostenstelle hinzugefügt"));
                      },
                      onError: (e) => toast.error((e as Error).message),
                    },
                  )
                }
              >
                {L("Add cost centre", "Kostenstelle hinzufügen")}
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {centres.map((c) => (
              <Badge key={c.id} variant="outline">
                {c.code} · {c.name}
              </Badge>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function PreferencesPanel({ L }: { L: Tr }) {
  const { data: prefs } = useDriverPreferences();
  const save = useSavePreferences();
  type BoolPref =
    | "step_free_only"
    | "large_type"
    | "high_contrast"
    | "reduced_motion"
    | "notify_email"
    | "notify_push";
  const rows: Array<{ key: BoolPref; label: string }> = [
    { key: "step_free_only", label: L("Step-free results only", "Nur barrierefreie Ergebnisse") },
    { key: "large_type", label: L("Large type", "Große Schrift") },
    { key: "high_contrast", label: L("High contrast", "Hoher Kontrast") },
    { key: "reduced_motion", label: L("Reduced motion", "Reduzierte Animation") },
    { key: "notify_email", label: L("Email notifications", "E-Mail-Benachrichtigungen") },
    { key: "notify_push", label: L("Push notifications", "Push-Benachrichtigungen") },
  ];

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <label key={String(row.key)} className="flex items-center justify-between gap-3 text-sm">
          {row.label}
          <Switch
            checked={Boolean(prefs?.[row.key])}
            onCheckedChange={(checked) => save.mutate({ [row.key]: checked })}
          />
        </label>
      ))}
      <div className="space-y-1.5">
        <Label>{L("Expiry reminder (minutes)", "Erinnerung vor Ablauf (Minuten)")}</Label>
        <Input
          type="number"
          min={0}
          max={120}
          defaultValue={prefs?.expiry_reminder_minutes ?? 15}
          onBlur={(e) =>
            save.mutate({
              expiry_reminder_minutes: Math.min(120, Math.max(0, Number(e.target.value) || 0)),
            })
          }
        />
      </div>
    </div>
  );
}

function SupportPanel({ L }: { L: Tr }) {
  const { data: cases = [] } = useSupportCases();
  const create = useCreateSupportCase();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>{L("Subject", "Betreff")}</Label>
        <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
        <Label>{L("How can we help?", "Wie können wir helfen?")}</Label>
        <Textarea rows={4} value={body} onChange={(e) => setBody(e.target.value)} />
        <Button
          disabled={create.isPending || subject.trim().length < 3 || body.trim().length < 10}
          onClick={() =>
            create.mutate(
              { subject: subject.trim(), category: "other", body: body.trim() },
              {
                onSuccess: () => {
                  setSubject("");
                  setBody("");
                  toast.success(L("Support case opened", "Supportfall eröffnet"));
                },
                onError: (e) => toast.error((e as Error).message),
              },
            )
          }
        >
          {L("Open case", "Fall eröffnen")}
        </Button>
      </div>
      <div className="space-y-2">
        {cases.map((c) => (
          <div
            key={c.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/40 px-3 py-2"
          >
            <div>
              <p className="text-sm font-medium">{c.subject}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(c.created_at).toLocaleDateString()}
              </p>
            </div>
            <Badge variant="outline">{c.status}</Badge>
          </div>
        ))}
      </div>
    </div>
  );
}
