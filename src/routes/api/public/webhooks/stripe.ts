import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/webhooks/stripe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const signature = request.headers.get("stripe-signature");
        if (!signature) return json({ error: "Missing Stripe signature" }, 400);

        const body = await request.text();
        let event: import("stripe").default.Event;
        try {
          const { constructStripeEvent } = await import("@/lib/payments.server");
          event = await constructStripeEvent(body, signature);
        } catch (error) {
          console.warn("[stripe-webhook] signature verification failed", (error as Error).message);
          return json({ error: "Invalid signature" }, 400);
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error: insertError } = await supabaseAdmin.from("payment_webhook_events").insert({
          provider: "stripe",
          event_id: event.id,
          event_type: event.type,
          payload: event as unknown as import("@/integrations/supabase/types").Json,
          status: "processing",
        });

        if (insertError?.code === "23505") {
          const { data: existing, error: existingError } = await supabaseAdmin
            .from("payment_webhook_events")
            .select("status")
            .eq("provider", "stripe")
            .eq("event_id", event.id)
            .maybeSingle();
          if (existingError) return json({ error: "Unable to verify duplicate event" }, 500);
          if (existing?.status === "processed" || existing?.status === "ignored") {
            return json({ received: true, duplicate: true });
          }
          if (existing?.status === "processing") {
            return json({ error: "Event is already processing" }, 409);
          }
          const { data: claimedRetry, error: retryError } = await supabaseAdmin
            .from("payment_webhook_events")
            .update({ status: "processing", error_message: null, processed_at: null })
            .eq("provider", "stripe")
            .eq("event_id", event.id)
            .eq("status", "failed")
            .select("id")
            .maybeSingle();
          if (retryError) return json({ error: "Unable to retry event" }, 500);
          if (!claimedRetry) return json({ error: "Event retry is already processing" }, 409);
        }

        if (insertError && insertError.code !== "23505") {
          console.error("[stripe-webhook] event persistence failed", insertError.message);
          return json({ error: "Webhook persistence failed" }, 500);
        }

        try {
          const { processStripeEvent } = await import("@/lib/payments.server");
          const result = await processStripeEvent(event);
          await supabaseAdmin
            .from("payment_webhook_events")
            .update({ status: result, processed_at: new Date().toISOString() })
            .eq("provider", "stripe")
            .eq("event_id", event.id);
          return json({ received: true });
        } catch (error) {
          const message = (error as Error).message.slice(0, 1000);
          console.error("[stripe-webhook] processing failed", event.id, message);
          await supabaseAdmin
            .from("payment_webhook_events")
            .update({
              status: "failed",
              error_message: message,
              processed_at: new Date().toISOString(),
            })
            .eq("provider", "stripe")
            .eq("event_id", event.id);
          return json({ error: "Webhook processing failed" }, 500);
        }
      },
    },
  },
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}
