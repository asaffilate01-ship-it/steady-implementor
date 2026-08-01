import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/lib/i18n";
import { euros } from "@/lib/parkpunkt-db";
import { useSaveTariffPlan, useTariffPlans, type TariffPlan } from "@/lib/product-db";
import { computeTariffQuote } from "@/lib/product-domain";

type SiteOption = { id: string; name: string; price_cents_per_hour: number };

export function TariffStudio({ sites }: { sites: SiteOption[] }) {
  const { lang } = useI18n();
  const L = (en: string, de: string) => (lang === "de" ? de : en);
  const { data: plans = [] } = useTariffPlans();
  const save = useSaveTariffPlan();

  const [siteId, setSiteId] = useState(sites[0]?.id ?? "");
  const site = sites.find((s) => s.id === siteId);
  const existing = plans.find((p) => p.site_id === siteId) as TariffPlan | undefined;

  const [form, setForm] = useState({
    free_minutes: "0",
    minimum_charge_cents: "0",
    service_fee_cents: "35",
    reservation_fee_cents: "50",
    daily_cap_cents: "",
    max_stay_minutes: "",
  });

  const preview = computeTariffQuote(
    {
      price_cents_per_hour: site?.price_cents_per_hour ?? 0,
      free_minutes: Number(form.free_minutes) || 0,
      minimum_charge_cents: Number(form.minimum_charge_cents) || 0,
      service_fee_cents: Number(form.service_fee_cents) || 0,
      reservation_fee_cents: Number(form.reservation_fee_cents) || 0,
      daily_cap_cents: form.daily_cap_cents ? Number(form.daily_cap_cents) : null,
      max_stay_minutes: form.max_stay_minutes ? Number(form.max_stay_minutes) : null,
    },
    120,
  );

  const fields: Array<{ key: keyof typeof form; label: string }> = [
    { key: "free_minutes", label: L("Free minutes", "Freiminuten") },
    { key: "minimum_charge_cents", label: L("Minimum charge (cents)", "Mindestbetrag (Cent)") },
    { key: "service_fee_cents", label: L("Service fee (cents)", "Servicegebühr (Cent)") },
    { key: "reservation_fee_cents", label: L("Reservation fee (cents)", "Reservierungsgebühr (Cent)") },
    { key: "daily_cap_cents", label: L("Daily cap (cents)", "Tagesdeckel (Cent)") },
    { key: "max_stay_minutes", label: L("Max stay (minutes)", "Max. Parkdauer (Minuten)") },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{L("Tariff studio", "Tarif-Studio")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label>{L("Location", "Standort")}</Label>
          <Select value={siteId} onValueChange={setSiteId}>
            <SelectTrigger>
              <SelectValue placeholder={L("Select a location", "Standort wählen")} />
            </SelectTrigger>
            <SelectContent>
              {sites.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {fields.map((f) => (
            <div key={f.key} className="space-y-1.5">
              <Label>{f.label}</Label>
              <Input
                inputMode="numeric"
                value={form[f.key]}
                onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
              />
            </div>
          ))}
        </div>

        <div className="rounded-lg border border-border/60 bg-background/40 p-3 text-sm">
          <p className="font-medium">{L("Preview — 2 hours", "Vorschau — 2 Stunden")}</p>
          <p className="text-muted-foreground">
            {L("Parking", "Parken")} {euros(preview.parkingCents)} + {L("service", "Service")}{" "}
            {euros(preview.serviceFeeCents)} ={" "}
            <span className="font-semibold text-foreground">{euros(preview.totalCents)}</span>
            {preview.cappedByDailyCap && (
              <Badge className="ml-2" variant="secondary">
                {L("capped", "gedeckelt")}
              </Badge>
            )}
          </p>
        </div>

        <Button
          disabled={!siteId || save.isPending}
          onClick={() =>
            save.mutate(
              {
                id: existing?.id,
                site_id: siteId,
                name: L("Standard tariff", "Standardtarif"),
                free_minutes: Number(form.free_minutes) || 0,
                minimum_charge_cents: Number(form.minimum_charge_cents) || 0,
                service_fee_cents: Number(form.service_fee_cents) || 0,
                reservation_fee_cents: Number(form.reservation_fee_cents) || 0,
                daily_cap_cents: form.daily_cap_cents ? Number(form.daily_cap_cents) : null,
                max_stay_minutes: form.max_stay_minutes ? Number(form.max_stay_minutes) : null,
              },
              {
                onSuccess: () => toast.success(L("Tariff saved", "Tarif gespeichert")),
                onError: (e) => toast.error((e as Error).message),
              },
            )
          }
        >
          {L("Save tariff", "Tarif speichern")}
        </Button>
      </CardContent>
    </Card>
  );
}