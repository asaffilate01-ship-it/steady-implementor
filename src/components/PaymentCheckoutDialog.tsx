import { useEffect, useMemo, useState } from "react";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { createPaymentIntentFn } from "@/lib/payment.functions";
import { euros, type Payment } from "@/lib/parkpunkt-db";

type Props = {
  payment: Payment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
};

const stripeCache = new Map<string, Promise<Stripe | null>>();

function stripeFor(publishableKey: string) {
  let promise = stripeCache.get(publishableKey);
  if (!promise) {
    promise = loadStripe(publishableKey);
    stripeCache.set(publishableKey, promise);
  }
  return promise;
}

export function PaymentCheckoutDialog({ payment, open, onOpenChange, onComplete }: Props) {
  const createIntent = useServerFn(createPaymentIntentFn);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [publishableKey, setPublishableKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !payment) {
      setClientSecret(null);
      setPublishableKey(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    createIntent({ data: { payment_id: payment.id } })
      .then((result) => {
        if (cancelled) return;
        setClientSecret(result.clientSecret);
        setPublishableKey(result.publishableKey);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError((err as Error).message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, payment, createIntent]);

  const stripePromise = useMemo(
    () => (publishableKey ? stripeFor(publishableKey) : null),
    [publishableKey],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Complete payment</DialogTitle>
          <DialogDescription>
            {payment
              ? `${payment.description ?? "Parking payment"} · ${euros(payment.amount_cents)}`
              : null}
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        )}

        {error && !loading && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {!loading && !error && clientSecret && stripePromise && (
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <CheckoutForm
              amountLabel={payment ? euros(payment.amount_cents) : ""}
              onDone={() => {
                onComplete?.();
                onOpenChange(false);
              }}
            />
          </Elements>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CheckoutForm({ amountLabel, onDone }: { amountLabel: string; onDone: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!stripe || !elements) return;
    setSubmitting(true);
    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: "if_required",
        confirmParams: { return_url: `${window.location.origin}/drive` },
      });
      if (error) {
        toast.error(error.message ?? "Payment failed");
        return;
      }
      if (paymentIntent && ["succeeded", "processing"].includes(paymentIntent.status)) {
        toast.success("Payment submitted");
        onDone();
        return;
      }
      toast.message("Payment is awaiting confirmation");
      onDone();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <PaymentElement />
      <DialogFooter>
        <Button disabled={!stripe || !elements || submitting} onClick={() => void handleSubmit()}>
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Pay {amountLabel}
        </Button>
      </DialogFooter>
    </div>
  );
}
