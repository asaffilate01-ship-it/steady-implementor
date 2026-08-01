import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/cron/dispatch-notifications")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { isAuthorizedCronRequest } = await import("@/lib/cron-auth.server");
        if (!isAuthorizedCronRequest(request)) {
          return json({ error: "Unauthorized" }, 401);
        }
        const gatewayUrl = process.env.NOTIFICATION_DELIVERY_WEBHOOK_URL;
        const gatewaySecret = process.env.NOTIFICATION_DELIVERY_WEBHOOK_SECRET;
        if (!gatewayUrl || !gatewaySecret)
          return json({ error: "Delivery gateway is not configured" }, 503);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: deliveries, error } = await supabaseAdmin.rpc(
          "claim_notification_deliveries",
          {
            _limit: 25,
          },
        );
        if (error) return json({ error: "Unable to claim notification deliveries" }, 500);

        const summary = { sent: 0, retried: 0, deadLettered: 0 };
        for (const delivery of deliveries ?? []) {
          const { data: notification, error: readError } = await supabaseAdmin
            .from("notifications")
            .select("id, user_id, type, title, body, action_url, metadata, created_at")
            .eq("id", delivery.notification_id)
            .maybeSingle();
          if (readError || !notification) {
            await failDelivery(
              delivery.id,
              delivery.attempts,
              readError?.message ?? "Notification missing",
            );
            summary.deadLettered += 1;
            continue;
          }

          try {
            const response = await fetch(gatewayUrl, {
              method: "POST",
              headers: {
                authorization: `Bearer ${gatewaySecret}`,
                "content-type": "application/json",
                "idempotency-key": delivery.id,
              },
              body: JSON.stringify({
                deliveryId: delivery.id,
                notification: {
                  userId: notification.user_id,
                  type: notification.type,
                  title: notification.title,
                  body: notification.body,
                  actionUrl: notification.action_url,
                  metadata: notification.metadata,
                  createdAt: notification.created_at,
                },
              }),
            });
            if (!response.ok) throw new Error(`Gateway returned ${response.status}`);
            const { error: updateError } = await supabaseAdmin
              .from("notification_deliveries")
              .update({
                status: "sent",
                sent_at: new Date().toISOString(),
                provider_ref: response.headers.get("x-delivery-id"),
                last_error: null,
              })
              .eq("id", delivery.id);
            if (updateError) throw new Error(updateError.message);
            summary.sent += 1;
          } catch (cause) {
            const deadLettered = await failDelivery(
              delivery.id,
              delivery.attempts,
              (cause as Error).message,
            );
            if (deadLettered) summary.deadLettered += 1;
            else summary.retried += 1;
          }
        }
        return json({ ok: true, claimed: deliveries?.length ?? 0, ...summary });
      },
    },
  },
});

async function failDelivery(id: string, attempts: number, message: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const deadLettered = attempts >= 8;
  const backoffMinutes = Math.min(2 ** Math.max(0, attempts - 1), 360);
  await supabaseAdmin
    .from("notification_deliveries")
    .update({
      status: deadLettered ? "dead_letter" : "pending",
      next_attempt_at: new Date(Date.now() + backoffMinutes * 60_000).toISOString(),
      last_error: message.slice(0, 1000),
    })
    .eq("id", id);
  return deadLettered;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}
