import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/lib/i18n";
import { euros } from "@/lib/parkpunkt-db";
import { useDiscardNoticeDraft, useNoticeDrafts, useSaveNoticeDraft } from "@/lib/product-db";
import { isValidPlate } from "@/lib/product-domain";

export function NoticeDrafts({
  siteId,
  onIssue,
}: {
  siteId: string | null;
  onIssue?: (draft: { plate: string; reason: string; amount_cents: number }) => void;
}) {
  const { lang } = useI18n();
  const L = (en: string, de: string) => (lang === "de" ? de : en);
  const { data: drafts = [] } = useNoticeDrafts();
  const save = useSaveNoticeDraft();
  const discard = useDiscardNoticeDraft();

  const [plate, setPlate] = useState("");
  const [reason, setReason] = useState("");
  const [amount, setAmount] = useState("30");
  const [notes, setNotes] = useState("");

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          {L("Offline drafts & evidence", "Offline-Entwürfe & Nachweise")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>{L("Plate", "Kennzeichen")}</Label>
            <Input
              value={plate}
              onChange={(e) => setPlate(e.target.value)}
              placeholder="B-PP 1234"
            />
          </div>
          <div className="space-y-1.5">
            <Label>{L("Reason", "Grund")}</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>{L("Amount (€)", "Betrag (€)")}</Label>
            <Input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="numeric" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>{L("Evidence notes (private)", "Nachweisnotizen (privat)")}</Label>
          <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <Button
          variant="outline"
          disabled={save.isPending}
          onClick={() => {
            if (!isValidPlate(plate) || reason.trim().length < 3) {
              toast.error(L("Plate and reason are required", "Kennzeichen und Grund erforderlich"));
              return;
            }
            save.mutate(
              {
                site_id: siteId,
                plate,
                reason: reason.trim(),
                amount_cents: Math.max(0, Math.round(Number(amount) || 0) * 100),
                evidence: { notes: notes.trim() },
              },
              {
                onSuccess: () => {
                  setPlate("");
                  setReason("");
                  setNotes("");
                  toast.success(L("Draft saved", "Entwurf gespeichert"));
                },
                onError: (e) => toast.error((e as Error).message),
              },
            );
          }}
        >
          {L("Save draft", "Entwurf speichern")}
        </Button>

        <div className="space-y-2">
          {drafts.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {L("No pending drafts.", "Keine offenen Entwürfe.")}
            </p>
          )}
          {drafts.map((d) => (
            <div
              key={d.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/40 px-3 py-2"
            >
              <div>
                <p className="font-mono text-sm font-semibold">{d.plate ?? "—"}</p>
                <p className="text-xs text-muted-foreground">
                  {d.reason ?? "—"} · {euros(d.amount_cents ?? 0)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{L("draft", "Entwurf")}</Badge>
                {onIssue && (
                  <Button
                    size="sm"
                    onClick={() =>
                      onIssue({
                        plate: d.plate ?? "",
                        reason: d.reason ?? "",
                        amount_cents: d.amount_cents ?? 0,
                      })
                    }
                  >
                    {L("Use", "Übernehmen")}
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => discard.mutate(d.id)}>
                  {L("Discard", "Verwerfen")}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
