import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  CircleDollarSign,
  Landmark,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
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
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  createSettlementBatchFn,
  getOperationsOverviewFn,
  markPayoutPaidFn,
} from "@/lib/operations.functions";
import { refundPaymentFn } from "@/lib/payment.functions";
import { euros, useMyPayments, usePayouts, type Payment } from "@/lib/parkpunkt-db";

function dateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function AdminOperations() {
  const getOverview = useServerFn(getOperationsOverviewFn);
  const createSettlement = useServerFn(createSettlementBatchFn);
  const markPaid = useServerFn(markPayoutPaidFn);
  const refund = useServerFn(refundPaymentFn);
  const qc = useQueryClient();
  const { data: payments = [] } = useMyPayments();
  const { data: payouts = [] } = usePayouts();
  const [refundPayment, setRefundPayment] = useState<Payment | null>(null);
  const [periodStart, setPeriodStart] = useState(() => {
    const start = new Date();
    start.setUTCDate(1);
    return dateInput(start);
  });
  const [periodEnd, setPeriodEnd] = useState(() => dateInput(new Date()));
  const [payoutRefs, setPayoutRefs] = useState<Record<string, string>>({});

  const overview = useQuery({
    queryKey: ["admin-operations-overview"],
    queryFn: () => getOverview(),
    refetchInterval: 30_000,
  });
  const settlementMutation = useMutation({
    mutationFn: () =>
      createSettlement({ data: { period_start: periodStart, period_end: periodEnd } }),
    onSuccess: (created) => {
      toast.success(
        created.length
          ? `${created.length} settlement batch${created.length === 1 ? "" : "es"} created`
          : "No eligible payments found for this period",
      );
      qc.invalidateQueries({ queryKey: ["payouts"] });
      qc.invalidateQueries({ queryKey: ["payments"] });
      overview.refetch();
    },
    onError: (error) => toast.error((error as Error).message),
  });
  const payoutMutation = useMutation({
    mutationFn: ({ payoutId, payoutRef }: { payoutId: string; payoutRef: string }) =>
      markPaid({ data: { payout_id: payoutId, payout_ref: payoutRef } }),
    onSuccess: () => {
      toast.success("Payout reconciled");
      qc.invalidateQueries({ queryKey: ["payouts"] });
      qc.invalidateQueries({ queryKey: ["payments"] });
      overview.refetch();
    },
    onError: (error) => toast.error((error as Error).message),
  });
  const refundMutation = useMutation({
    mutationFn: (paymentId: string) => refund({ data: { payment_id: paymentId } }),
    onSuccess: () => {
      toast.success("Refund submitted to Stripe");
      setRefundPayment(null);
      overview.refetch();
    },
    onError: (error) => toast.error((error as Error).message),
  });

  const readiness = overview.data?.readiness ?? [];
  const readyCount = readiness.filter((item) => item.ready).length;
  const readinessPercent = readiness.length ? Math.round((readyCount / readiness.length) * 100) : 0;
  const unhealthyProviders = (overview.data?.providers ?? []).filter(
    (provider) => provider.last_sync_status !== "healthy",
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[1.35fr,1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-4 w-4" /> Production readiness
              <Badge
                variant={readinessPercent === 100 ? "default" : "secondary"}
                className="ml-auto"
              >
                {readinessPercent}%
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {overview.isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {overview.error && (
              <p className="text-sm text-destructive">{(overview.error as Error).message}</p>
            )}
            <Progress value={readinessPercent} />
            <div className="grid gap-2 sm:grid-cols-2">
              {readiness.map((item) => (
                <div
                  key={item.key}
                  className="flex gap-2 rounded-md border border-border p-3 text-sm"
                >
                  {item.ready ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                  ) : (
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                  )}
                  <div>
                    <div className="font-medium">{item.label}</div>
                    {!item.ready && (
                      <div className="mt-1 text-xs text-muted-foreground">{item.detail}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Operational alerts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <OperationalMetric
              label="Failed payment webhooks"
              value={overview.data?.failedWebhookCount ?? 0}
              warning={(overview.data?.failedWebhookCount ?? 0) > 0}
            />
            <OperationalMetric
              label="Appeals awaiting review"
              value={overview.data?.pendingAppealCount ?? 0}
              warning={(overview.data?.pendingAppealCount ?? 0) > 0}
            />
            <OperationalMetric
              label="Undeliverable notifications"
              value={overview.data?.deadLetterNotificationCount ?? 0}
              warning={(overview.data?.deadLetterNotificationCount ?? 0) > 0}
            />
            <OperationalMetric
              label="Providers needing attention"
              value={unhealthyProviders.length}
              warning={unhealthyProviders.some(
                (provider) => provider.last_sync_status === "failed",
              )}
            />
            {unhealthyProviders.slice(0, 4).map((provider) => (
              <div key={provider.id} className="rounded-md bg-secondary p-2 text-xs">
                <span className="font-medium">{provider.name}</span> · {provider.last_sync_status}
                {provider.last_sync_error ? ` · ${provider.last_sync_error}` : ""}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CircleDollarSign className="h-4 w-4" /> Payment operations
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="min-w-[600px] w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-2">Payment</th>
                  <th>Status</th>
                  <th>Payout</th>
                  <th>Amount</th>
                  <th></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {payments.slice(0, 12).map((payment) => (
                  <tr key={payment.id}>
                    <td className="py-2">
                      <div>{payment.description ?? "Parking payment"}</div>
                      <div className="font-mono text-xs text-muted-foreground">
                        {payment.id.slice(0, 8)}
                      </div>
                    </td>
                    <td>
                      <Badge variant="outline" className="capitalize">
                        {payment.status}
                      </Badge>
                    </td>
                    <td className="capitalize text-muted-foreground">{payment.payout_status}</td>
                    <td>{euros(payment.amount_cents)}</td>
                    <td className="text-right">
                      {payment.status === "paid" &&
                        payment.refunded_cents < payment.amount_cents && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setRefundPayment(payment)}
                          >
                            <RotateCcw className="mr-1 h-3 w-3" /> Refund
                          </Button>
                        )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Landmark className="h-4 w-4" /> Settlement reconciliation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-[1fr,1fr,auto]">
              <Input
                type="date"
                value={periodStart}
                onChange={(event) => setPeriodStart(event.target.value)}
              />
              <Input
                type="date"
                value={periodEnd}
                onChange={(event) => setPeriodEnd(event.target.value)}
              />
              <Button
                disabled={settlementMutation.isPending}
                onClick={() => settlementMutation.mutate()}
              >
                {settlementMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create batch
              </Button>
            </div>
            <div className="space-y-2">
              {payouts.slice(0, 8).map((payout) => (
                <div key={payout.id} className="rounded-md border border-border p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="font-medium">{euros(payout.total_net_cents)} net</div>
                      <div className="text-xs text-muted-foreground">
                        {payout.period_start} to {payout.period_end} ·{" "}
                        {euros(payout.total_platform_fee_cents)} fee
                      </div>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {payout.status}
                    </Badge>
                  </div>
                  {payout.status !== "paid" && payout.status !== "cancelled" && (
                    <div className="mt-3 flex gap-2">
                      <Input
                        value={payoutRefs[payout.id] ?? ""}
                        onChange={(event) =>
                          setPayoutRefs({ ...payoutRefs, [payout.id]: event.target.value })
                        }
                        placeholder="Bank / provider payout reference"
                      />
                      <Button
                        size="sm"
                        disabled={
                          (payoutRefs[payout.id]?.trim().length ?? 0) < 3 ||
                          payoutMutation.isPending
                        }
                        onClick={() =>
                          payoutMutation.mutate({
                            payoutId: payout.id,
                            payoutRef: payoutRefs[payout.id],
                          })
                        }
                      >
                        Mark paid
                      </Button>
                    </div>
                  )}
                </div>
              ))}
              {payouts.length === 0 && (
                <p className="text-sm text-muted-foreground">No settlement batches yet.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent audit activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border text-sm">
            {(overview.data?.audits ?? []).map((audit) => (
              <div key={audit.id} className="grid gap-1 py-2 sm:grid-cols-[180px,1fr,180px]">
                <span className="font-mono text-xs">{audit.action}</span>
                <span className="text-muted-foreground">
                  {audit.entity_type}
                  {audit.entity_id ? ` · ${audit.entity_id.slice(0, 12)}` : ""}
                </span>
                <span className="text-xs text-muted-foreground sm:text-right">
                  {new Date(audit.created_at).toLocaleString()}
                </span>
              </div>
            ))}
            {!overview.isLoading && (overview.data?.audits.length ?? 0) === 0 && (
              <p className="py-3 text-sm text-muted-foreground">No audit events recorded yet.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!refundPayment} onOpenChange={(open) => !open && setRefundPayment(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Refund payment</DialogTitle>
            <DialogDescription>
              This submits a full{" "}
              {refundPayment
                ? euros(refundPayment.amount_cents - refundPayment.refunded_cents)
                : ""}{" "}
              refund to Stripe. The signed webhook will finalize the local record.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundPayment(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!refundPayment || refundMutation.isPending}
              onClick={() => refundPayment && refundMutation.mutate(refundPayment.id)}
            >
              {refundMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit refund
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function OperationalMetric({
  label,
  value,
  warning,
}: {
  label: string;
  value: number;
  warning: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border p-3 text-sm">
      <span>{label}</span>
      <Badge variant={warning ? "destructive" : "secondary"}>{value}</Badge>
    </div>
  );
}
