import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  euros,
  useSites,
  useNotices,
  useNoticeAppeals,
  useIssueNotice,
  useResolveNoticeAppeal,
  useUpdateNotice,
  useRealtimeSync,
} from "@/lib/parkpunkt-db";
import {
  Camera,
  CheckCircle2,
  AlertTriangle,
  FileWarning,
  Ban,
  Loader2,
  Scale,
} from "lucide-react";
import { RoleGate } from "@/components/RoleGate";
import { useI18n } from "@/lib/i18n";
import { useServerFn } from "@tanstack/react-start";
import { checkParkingSessionFn } from "@/lib/parking.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/enforcement")({
  head: () => ({
    meta: [
      { title: "ParkPunkt Enforcement" },
      {
        name: "description",
        content: "ANPR plate checks and enforcement notice issuance for authorised officers.",
      },
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
  const { t } = useI18n();
  const [plate, setPlate] = useState("");
  const [siteId, setSiteId] = useState<string>("");
  const [reason, setReason] = useState(t("enf.reason.default"));
  const [amount, setAmount] = useState(35);
  const [officerNote, setOfficerNote] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [appealReview, setAppealReview] = useState<{
    id: string;
    decision: "accepted" | "upheld";
  } | null>(null);
  const [appealResponse, setAppealResponse] = useState("");
  const [scan, setScan] = useState<{
    status: "unknown" | "valid" | "invalid";
    endsAt?: string;
  } | null>(null);
  const [scanning, setScanning] = useState(false);
  const checkSession = useServerFn(checkParkingSessionFn);

  useRealtimeSync(["notices"]);
  const { data: sites = [] } = useSites();
  const { data: notices = [] } = useNotices();
  const { data: appeals = [] } = useNoticeAppeals();
  const issue = useIssueNotice();
  const resolveAppeal = useResolveNoticeAppeal();
  const update = useUpdateNotice();
  useEffect(() => {
    if (!siteId && sites[0]) setSiteId(sites[0].id);
  }, [siteId, sites]);

  const currentSite = useMemo(() => sites.find((s) => s.id === siteId), [sites, siteId]);

  async function runScan() {
    const p = plate.trim().toUpperCase();
    if (!p) return;
    setScanning(true);
    try {
      const result = await checkSession({ data: { site_id: siteId, plate: p } });
      setScan(
        result.status === "valid"
          ? { status: "valid", endsAt: result.endsAt }
          : { status: "invalid" },
      );
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setScanning(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("enf.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("enf.sub")}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-4 w-4" />
              {t("enf.scanner")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Field label={t("enf.site")}>
              <Select value={siteId} onValueChange={setSiteId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sites.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label={t("enf.plate")}>
              <div className="flex gap-2">
                <Input
                  value={plate}
                  onChange={(e) => {
                    setPlate(e.target.value);
                    setScan(null);
                  }}
                  placeholder="e.g. B-PP 2026"
                  className="font-mono uppercase"
                />
                <Button disabled={scanning || !siteId} onClick={runScan}>
                  {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : t("enf.scan")}
                </Button>
              </div>
            </Field>
            {scan &&
              (scan.status === "valid" ? (
                <div className="flex items-center gap-2 rounded-md border border-accent/40 bg-accent/10 p-3 text-sm">
                  <CheckCircle2 className="h-5 w-5 text-accent" />
                  <div>
                    {t("enf.valid")} {t("enf.at")} {currentSite?.name} · {t("enf.until")}{" "}
                    {scan.endsAt
                      ? new Date(scan.endsAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  <div>
                    {t("enf.invalid")} {currentSite?.name}.
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileWarning className="h-4 w-4" />
              {t("enf.issue")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Field label={t("enf.reason")}>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} />
            </Field>
            <Field label={t("enf.amount")}>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              />
            </Field>
            <Field label="Observation note">
              <Textarea
                value={officerNote}
                onChange={(event) => setOfficerNote(event.target.value)}
                rows={3}
                maxLength={2000}
                placeholder="Location, signage and observed circumstances"
              />
            </Field>
            <Field label="Evidence photo URL (optional)">
              <Input
                type="url"
                value={photoUrl}
                onChange={(event) => setPhotoUrl(event.target.value)}
                placeholder="https://secure-evidence.example/photo…"
              />
            </Field>
            <Button
              variant="destructive"
              className="w-full"
              disabled={!plate || scan?.status !== "invalid" || !siteId || issue.isPending}
              onClick={async () => {
                try {
                  await issue.mutateAsync({
                    site_id: siteId,
                    plate: plate.toUpperCase(),
                    reason,
                    amount_cents: Math.round(amount * 100),
                    evidence: {
                      observed_at: new Date().toISOString(),
                      officer_note: officerNote.trim() || undefined,
                      photo_urls: photoUrl.trim() ? [photoUrl.trim()] : [],
                    },
                  });
                  toast.success(t("enf.issued"));
                  setPlate("");
                  setScan(null);
                  setOfficerNote("");
                  setPhotoUrl("");
                } catch (error) {
                  toast.error((error as Error).message);
                }
              }}
            >
              {t("enf.issue")}
            </Button>
            {scan?.status === "valid" && (
              <p className="text-xs text-muted-foreground">{t("enf.disabled")}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {t("enf.recent")} ({notices.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {notices.length === 0 && (
            <div className="text-sm text-muted-foreground">{t("enf.empty")}</div>
          )}
          <div className="divide-y divide-border">
            {notices.map((n) => {
              const s = sites.find((x) => x.id === n.site_id);
              const statusVariant =
                n.status === "paid"
                  ? "default"
                  : n.status === "waived"
                    ? "secondary"
                    : n.status === "contested"
                      ? "outline"
                      : "destructive";
              return (
                <div
                  key={n.id}
                  className="grid min-w-[780px] grid-cols-[1fr,1fr,2fr,110px,90px,160px] items-center gap-3 py-2 text-sm"
                >
                  <div className="font-mono text-xs">{n.id.slice(0, 8)}</div>
                  <div className="font-mono">{n.plate}</div>
                  <div className="truncate">
                    {s?.name} — {n.reason}
                    {typeof n.evidence === "object" &&
                      n.evidence !== null &&
                      !Array.isArray(n.evidence) &&
                      typeof n.evidence.officer_note === "string" && (
                        <span className="block truncate text-xs text-muted-foreground">
                          {n.evidence.officer_note}
                        </span>
                      )}
                  </div>
                  <div>{euros(n.amount_cents)}</div>
                  <div>
                    <Badge variant={statusVariant as never} className="capitalize">
                      {n.status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-end gap-1">
                    {n.status === "open" && (
                      <>
                        <Button
                          aria-label={t("enf.contest")}
                          title={t("enf.contest")}
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            update.mutate(
                              { id: n.id, patch: { status: "contested" } },
                              { onError: (error) => toast.error(error.message) },
                            )
                          }
                        >
                          <AlertTriangle className="h-3 w-3" />
                        </Button>
                        <Button
                          aria-label={t("enf.waive")}
                          title={t("enf.waive")}
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            update.mutate(
                              { id: n.id, patch: { status: "waived" } },
                              { onError: (error) => toast.error(error.message) },
                            )
                          }
                        >
                          <Ban className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                    <Badge variant="outline" className="text-[10px]">
                      {new Date(n.created_at).toLocaleTimeString()}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-4 w-4" /> Appeals queue ({appeals.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {appeals.length === 0 && (
            <p className="text-sm text-muted-foreground">No appeals are awaiting review.</p>
          )}
          {appeals.map((appeal) => {
            const notice = notices.find((item) => item.id === appeal.notice_id);
            const pending = appeal.status === "submitted" || appeal.status === "reviewing";
            return (
              <div key={appeal.id} className="rounded-md border border-border p-4 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">
                      {notice?.plate ?? "Notice"} · {appeal.reason}
                    </div>
                    <p className="mt-1 max-w-2xl text-muted-foreground">{appeal.details}</p>
                  </div>
                  <Badge variant="outline" className="capitalize">
                    {appeal.status}
                  </Badge>
                </div>
                {appeal.response && (
                  <p className="mt-3 rounded bg-secondary p-3 text-xs">
                    Decision: {appeal.response}
                  </p>
                )}
                {pending && (
                  <div className="mt-3 flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setAppealReview({ id: appeal.id, decision: "accepted" })}
                    >
                      Accept appeal
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setAppealReview({ id: appeal.id, decision: "upheld" })}
                    >
                      Uphold notice
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Dialog
        open={!!appealReview}
        onOpenChange={(open) => {
          if (!open) setAppealReview(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {appealReview?.decision === "accepted" ? "Accept appeal" : "Uphold notice"}
            </DialogTitle>
            <DialogDescription>
              Give the driver a clear reason. This response becomes part of the audit record.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            rows={6}
            value={appealResponse}
            maxLength={4000}
            onChange={(event) => setAppealResponse(event.target.value)}
            placeholder="Decision reasoning and any relevant evidence…"
          />
          <DialogFooter>
            <Button
              disabled={
                !appealReview || appealResponse.trim().length < 10 || resolveAppeal.isPending
              }
              onClick={async () => {
                if (!appealReview) return;
                try {
                  await resolveAppeal.mutateAsync({
                    appeal_id: appealReview.id,
                    decision: appealReview.decision,
                    response: appealResponse,
                  });
                  toast.success("Appeal decision recorded");
                  setAppealReview(null);
                  setAppealResponse("");
                } catch (error) {
                  toast.error((error as Error).message);
                }
              }}
            >
              {resolveAppeal.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Record decision
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
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
