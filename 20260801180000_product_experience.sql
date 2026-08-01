-- ParkPunkt production completion
-- Adds durable payment processing, notice appeals, notifications, provider
-- health, settlement lineage, and tenant-scoped audit trails.

-- ---------------------------------------------------------------------------
-- Payment processing and reconciliation
-- ---------------------------------------------------------------------------
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS provider text,
  ADD COLUMN IF NOT EXISTS provider_payment_id text,
  ADD COLUMN IF NOT EXISTS provider_charge_id text,
  ADD COLUMN IF NOT EXISTS failure_code text,
  ADD COLUMN IF NOT EXISTS failure_message text,
  ADD COLUMN IF NOT EXISTS refunded_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_status_check;
ALTER TABLE public.payments
  ADD CONSTRAINT payments_status_check
  CHECK (status IN ('pending','authorized','paid','failed','cancelled','refunded','disputed'));

ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_refunded_cents_check;
ALTER TABLE public.payments
  ADD CONSTRAINT payments_refunded_cents_check
  CHECK (refunded_cents >= 0 AND refunded_cents <= amount_cents);

ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_payout_status_check;
ALTER TABLE public.payments
  ADD CONSTRAINT payments_payout_status_check
  CHECK (payout_status IN ('pending','eligible','processing','paid','held'));

CREATE UNIQUE INDEX IF NOT EXISTS payments_provider_payment_unique
  ON public.payments(provider, provider_payment_id)
  WHERE provider IS NOT NULL AND provider_payment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS payments_reconciliation_idx
  ON public.payments(status, payout_status, paid_at DESC);

-- Legacy records created before webhook settlement are made reconcilable once.
UPDATE public.payments
SET paid_at = COALESCE(paid_at, updated_at, created_at), payout_status = 'eligible'
WHERE status = 'paid' AND payout_status = 'pending';
UPDATE public.payments
SET payout_status = 'held'
WHERE status IN ('failed','cancelled','refunded','disputed');

CREATE TABLE IF NOT EXISTS public.payment_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  event_id text NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'processing'
    CHECK (status IN ('processing','processed','failed','ignored')),
  error_message text,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  UNIQUE(provider, event_id)
);

ALTER TABLE public.payment_webhook_events ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.payment_webhook_events TO service_role;
REVOKE ALL ON public.payment_webhook_events FROM PUBLIC, anon, authenticated;
CREATE INDEX IF NOT EXISTS payment_webhook_events_status_idx
  ON public.payment_webhook_events(status, received_at DESC);

ALTER TABLE public.payouts
  DROP CONSTRAINT IF EXISTS payouts_status_check;
ALTER TABLE public.payouts
  ADD CONSTRAINT payouts_status_check
  CHECK (status IN ('open','processing','paid','failed','cancelled'));

CREATE TABLE IF NOT EXISTS public.settlement_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_id uuid NOT NULL REFERENCES public.payouts(id) ON DELETE CASCADE,
  payment_id uuid NOT NULL UNIQUE REFERENCES public.payments(id) ON DELETE RESTRICT,
  gross_cents integer NOT NULL CHECK (gross_cents >= 0),
  platform_fee_cents integer NOT NULL CHECK (platform_fee_cents >= 0),
  net_cents integer NOT NULL CHECK (net_cents >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.settlement_items ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.settlement_items TO authenticated;
GRANT ALL ON public.settlement_items TO service_role;
CREATE POLICY "Admins read settlement items" ON public.settlement_items
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Operators read own settlement items" ON public.settlement_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.payouts po
      WHERE po.id = settlement_items.payout_id
        AND po.org_id IS NOT NULL
        AND public.is_operator_org_member(po.org_id)
    )
  );

-- ---------------------------------------------------------------------------
-- Notice evidence and appeals
-- ---------------------------------------------------------------------------
ALTER TABLE public.notices
  ADD COLUMN IF NOT EXISTS driver_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS appeal_deadline timestamptz,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS trg_notices_updated ON public.notices;
CREATE TRIGGER trg_notices_updated BEFORE UPDATE ON public.notices
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX IF NOT EXISTS notices_driver_idx
  ON public.notices(driver_id, created_at DESC) WHERE driver_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.notice_appeals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notice_id uuid NOT NULL UNIQUE REFERENCES public.notices(id) ON DELETE CASCADE,
  driver_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text NOT NULL,
  details text NOT NULL,
  status text NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted','reviewing','accepted','upheld')),
  response text,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notice_appeals ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.notice_appeals TO authenticated;
GRANT ALL ON public.notice_appeals TO service_role;
CREATE POLICY "Drivers read own appeals" ON public.notice_appeals
  FOR SELECT TO authenticated USING (driver_id = auth.uid());
CREATE POLICY "Enforcement and admins read appeals" ON public.notice_appeals
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'enforcement')
  );
CREATE POLICY "Operators read site appeals" ON public.notice_appeals
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.notices n
      JOIN public.sites s ON s.id = n.site_id
      WHERE n.id = notice_appeals.notice_id
        AND s.org_id IS NOT NULL
        AND public.is_operator_org_member(s.org_id)
    )
  );
DROP TRIGGER IF EXISTS trg_notice_appeals_updated ON public.notice_appeals;
CREATE TRIGGER trg_notice_appeals_updated BEFORE UPDATE ON public.notice_appeals
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

DROP POLICY IF EXISTS "Drivers read assigned notices" ON public.notices;
CREATE POLICY "Drivers read assigned notices" ON public.notices
  FOR SELECT TO authenticated USING (driver_id = auth.uid());

-- ---------------------------------------------------------------------------
-- In-product notifications and immutable operational audit
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  action_url text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
CREATE POLICY "Users read own notifications" ON public.notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE INDEX IF NOT EXISTS notifications_user_unread_idx
  ON public.notifications(user_id, created_at DESC) WHERE read_at IS NULL;

CREATE TABLE IF NOT EXISTS public.audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  org_id uuid REFERENCES public.orgs(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.audit_events TO authenticated;
GRANT ALL ON public.audit_events TO service_role;
CREATE POLICY "Admins read audit events" ON public.audit_events
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Operators read own audit events" ON public.audit_events
  FOR SELECT TO authenticated
  USING (org_id IS NOT NULL AND public.is_operator_org_member(org_id));
CREATE INDEX IF NOT EXISTS audit_events_entity_idx
  ON public.audit_events(entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_events_org_idx
  ON public.audit_events(org_id, created_at DESC) WHERE org_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Provider freshness and failure visibility
-- ---------------------------------------------------------------------------
ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS last_sync_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_sync_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_sync_status text NOT NULL DEFAULT 'never',
  ADD COLUMN IF NOT EXISTS last_sync_error text,
  ADD COLUMN IF NOT EXISTS last_sync_created integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_sync_updated integer NOT NULL DEFAULT 0;

ALTER TABLE public.providers
  DROP CONSTRAINT IF EXISTS providers_last_sync_status_check;
ALTER TABLE public.providers
  ADD CONSTRAINT providers_last_sync_status_check
  CHECK (last_sync_status IN ('never','running','healthy','degraded','failed'));

-- ---------------------------------------------------------------------------
-- Narrow client RPCs
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mark_notification_read(_notification_id uuid)
RETURNS public.notifications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_notification public.notifications%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  UPDATE public.notifications
  SET read_at = COALESCE(read_at, now())
  WHERE id = _notification_id AND user_id = auth.uid()
  RETURNING * INTO v_notification;
  IF NOT FOUND THEN RAISE EXCEPTION 'Notification not found'; END IF;
  RETURN v_notification;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_notice_appeal(
  _notice_id uuid,
  _reason text,
  _details text
)
RETURNS public.notice_appeals
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notice public.notices%ROWTYPE;
  v_appeal public.notice_appeals%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO v_notice FROM public.notices WHERE id = _notice_id FOR UPDATE;
  IF NOT FOUND OR v_notice.driver_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Notice not found';
  END IF;
  IF v_notice.status <> 'open' THEN RAISE EXCEPTION 'Notice cannot be appealed'; END IF;
  IF v_notice.appeal_deadline IS NOT NULL AND v_notice.appeal_deadline < now() THEN
    RAISE EXCEPTION 'Appeal deadline has passed';
  END IF;
  IF length(trim(_reason)) < 3 OR length(trim(_reason)) > 120 THEN
    RAISE EXCEPTION 'Invalid appeal reason';
  END IF;
  IF length(trim(_details)) < 20 OR length(trim(_details)) > 4000 THEN
    RAISE EXCEPTION 'Appeal details must be between 20 and 4000 characters';
  END IF;

  INSERT INTO public.notice_appeals(notice_id, driver_id, reason, details)
  VALUES (_notice_id, auth.uid(), trim(_reason), trim(_details))
  RETURNING * INTO v_appeal;
  UPDATE public.notices SET status = 'contested' WHERE id = _notice_id;
  RETURN v_appeal;
END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_notice_appeal(
  _appeal_id uuid,
  _decision text,
  _response text
)
RETURNS public.notice_appeals
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_appeal public.notice_appeals%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'enforcement')
  ) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF _decision NOT IN ('accepted','upheld') THEN RAISE EXCEPTION 'Invalid decision'; END IF;
  IF length(trim(_response)) < 10 OR length(trim(_response)) > 4000 THEN
    RAISE EXCEPTION 'A response between 10 and 4000 characters is required';
  END IF;

  UPDATE public.notice_appeals
  SET status = _decision, response = trim(_response), resolved_at = now()
  WHERE id = _appeal_id AND status IN ('submitted','reviewing')
  RETURNING * INTO v_appeal;
  IF NOT FOUND THEN RAISE EXCEPTION 'Appeal not found or already resolved'; END IF;

  UPDATE public.notices
  SET status = CASE WHEN _decision = 'accepted' THEN 'waived' ELSE 'open' END
  WHERE id = v_appeal.notice_id;

  INSERT INTO public.notifications(user_id, type, title, body, action_url, metadata)
  VALUES (
    v_appeal.driver_id,
    'notice_appeal_decision',
    CASE WHEN _decision = 'accepted' THEN 'Appeal accepted' ELSE 'Appeal reviewed' END,
    CASE WHEN _decision = 'accepted'
      THEN 'Your parking notice appeal was accepted and the notice was waived.'
      ELSE 'Your parking notice appeal was reviewed and the notice remains payable.'
    END,
    '/drive',
    jsonb_build_object('notice_id', v_appeal.notice_id, 'appeal_id', v_appeal.id)
  );
  RETURN v_appeal;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_notice_payment(_notice_id uuid)
RETURNS public.payments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notice public.notices%ROWTYPE;
  v_payment public.payments%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO v_notice FROM public.notices WHERE id = _notice_id FOR UPDATE;
  IF NOT FOUND OR v_notice.driver_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Notice not found';
  END IF;
  IF v_notice.status <> 'open' THEN RAISE EXCEPTION 'Notice is not payable'; END IF;

  SELECT * INTO v_payment
  FROM public.payments
  WHERE notice_id = _notice_id AND status <> 'failed'
  ORDER BY created_at DESC
  LIMIT 1;
  IF FOUND THEN RETURN v_payment; END IF;

  INSERT INTO public.payments(
    driver_id, site_id, notice_id, amount_cents, currency, method,
    status, description, metadata
  ) VALUES (
    auth.uid(), v_notice.site_id, v_notice.id, v_notice.amount_cents, 'EUR', 'card',
    'pending', 'Parking notice ' || left(v_notice.id::text, 8),
    jsonb_build_object('source', 'notice')
  )
  RETURNING * INTO v_payment;
  RETURN v_payment;
END;
$$;

CREATE OR REPLACE FUNCTION public.issue_parking_notice_v2(
  _site_id uuid,
  _plate text,
  _reason text,
  _amount_cents integer,
  _evidence jsonb DEFAULT '{}'::jsonb
)
RETURNS public.notices
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notice public.notices%ROWTYPE;
  v_driver_id uuid;
  v_plate text := upper(trim(_plate));
BEGIN
  IF auth.uid() IS NULL OR NOT (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'enforcement')
  ) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.sites WHERE id = _site_id) THEN
    RAISE EXCEPTION 'Site not found';
  END IF;
  IF length(v_plate) < 2 OR length(v_plate) > 16 THEN
    RAISE EXCEPTION 'Invalid registration plate';
  END IF;
  IF length(trim(_reason)) < 3 OR _amount_cents < 0 OR _amount_cents > 100000 THEN
    RAISE EXCEPTION 'Invalid notice';
  END IF;
  IF pg_column_size(COALESCE(_evidence, '{}'::jsonb)) > 65536 THEN
    RAISE EXCEPTION 'Evidence metadata is too large';
  END IF;

  SELECT sess.user_id INTO v_driver_id
  FROM public.sessions sess
  WHERE sess.site_id = _site_id
    AND upper(sess.plate) = v_plate
    AND sess.started_at <= now()
    AND sess.ends_at > now() - interval '24 hours'
  ORDER BY sess.created_at DESC
  LIMIT 1;

  INSERT INTO public.notices(
    site_id, plate, reason, amount_cents, issued_by, driver_id,
    status, evidence, appeal_deadline
  ) VALUES (
    _site_id, v_plate, trim(_reason), _amount_cents, auth.uid(), v_driver_id,
    'open', COALESCE(_evidence, '{}'::jsonb), now() + interval '14 days'
  )
  RETURNING * INTO v_notice;

  IF v_driver_id IS NOT NULL THEN
    INSERT INTO public.notifications(user_id, type, title, body, action_url, metadata)
    VALUES (
      v_driver_id,
      'parking_notice',
      'New parking notice',
      'A parking notice was issued for vehicle ' || v_plate || '.',
      '/drive',
      jsonb_build_object('notice_id', v_notice.id)
    );
  END IF;
  RETURN v_notice;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_notification_read(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_notice_appeal(uuid,text,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.resolve_notice_appeal(uuid,text,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_notice_payment(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.issue_parking_notice_v2(uuid,text,text,integer,jsonb) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.mark_notification_read(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_notice_appeal(uuid,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_notice_appeal(uuid,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_notice_payment(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.issue_parking_notice_v2(uuid,text,text,integer,jsonb) TO authenticated;

-- Underlying tables remain read-only to browsers. All mutations above are
-- validated inside SECURITY DEFINER functions or performed by the service role.
REVOKE INSERT, UPDATE, DELETE ON public.notices FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.notice_appeals FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.notifications FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.audit_events FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.settlement_items FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.payments FROM authenticated;
DROP POLICY IF EXISTS "Admins manage payouts" ON public.payouts;
CREATE POLICY "Admins read payouts" ON public.payouts
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
REVOKE INSERT, UPDATE, DELETE ON public.payouts FROM authenticated;

-- Settlement batches are built transactionally: a payment can belong to only
-- one settlement item, and becomes locked for payout processing immediately.
CREATE UNIQUE INDEX IF NOT EXISTS payouts_org_period_unique
  ON public.payouts(org_id, period_start, period_end)
  WHERE org_id IS NOT NULL AND provider_id IS NULL;

CREATE OR REPLACE FUNCTION public.create_settlement_batch(
  _period_start date,
  _period_end date
)
RETURNS SETOF public.payouts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group record;
  v_payout public.payouts%ROWTYPE;
BEGIN
  IF _period_end < _period_start OR _period_end > current_date THEN
    RAISE EXCEPTION 'Invalid settlement period';
  END IF;

  FOR v_group IN
    SELECT
      s.org_id,
      sum(p.amount_cents)::integer AS gross,
      sum(p.platform_fee_cents)::integer AS fee,
      sum(p.operator_net_cents)::integer AS net
    FROM public.payments p
    JOIN public.sites s ON s.id = p.site_id
    WHERE p.status = 'paid'
      AND p.payout_status = 'eligible'
      AND p.paid_at >= _period_start::timestamptz
      AND p.paid_at < (_period_end + 1)::timestamptz
      AND s.org_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.settlement_items si WHERE si.payment_id = p.id
      )
    GROUP BY s.org_id
  LOOP
    IF EXISTS (
      SELECT 1 FROM public.payouts po
      WHERE po.org_id = v_group.org_id
        AND po.provider_id IS NULL
        AND po.period_start = _period_start
        AND po.period_end = _period_end
    ) THEN
      CONTINUE;
    END IF;

    INSERT INTO public.payouts(
      org_id, period_start, period_end, total_gross_cents,
      total_platform_fee_cents, total_net_cents, status
    ) VALUES (
      v_group.org_id, _period_start, _period_end, v_group.gross,
      v_group.fee, v_group.net, 'open'
    ) RETURNING * INTO v_payout;

    INSERT INTO public.settlement_items(
      payout_id, payment_id, gross_cents, platform_fee_cents, net_cents
    )
    SELECT
      v_payout.id, p.id, p.amount_cents, p.platform_fee_cents, p.operator_net_cents
    FROM public.payments p
    JOIN public.sites s ON s.id = p.site_id
    WHERE s.org_id = v_group.org_id
      AND p.status = 'paid'
      AND p.payout_status = 'eligible'
      AND p.paid_at >= _period_start::timestamptz
      AND p.paid_at < (_period_end + 1)::timestamptz
      AND NOT EXISTS (
        SELECT 1 FROM public.settlement_items si WHERE si.payment_id = p.id
      );

    UPDATE public.payments p
    SET payout_status = 'processing'
    WHERE EXISTS (
      SELECT 1 FROM public.settlement_items si
      WHERE si.payment_id = p.id AND si.payout_id = v_payout.id
    );
    RETURN NEXT v_payout;
  END LOOP;
  RETURN;
END;
$$;

REVOKE ALL ON FUNCTION public.create_settlement_batch(date,date)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_settlement_batch(date,date) TO service_role;

CREATE OR REPLACE FUNCTION public.mark_payout_paid(
  _payout_id uuid,
  _payout_ref text
)
RETURNS public.payouts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_payout public.payouts%ROWTYPE;
BEGIN
  IF length(trim(_payout_ref)) < 3 OR length(trim(_payout_ref)) > 200 THEN
    RAISE EXCEPTION 'Invalid payout reference';
  END IF;
  UPDATE public.payouts
  SET status = 'paid', paid_at = now(), payout_ref = trim(_payout_ref)
  WHERE id = _payout_id AND status IN ('open','processing')
  RETURNING * INTO v_payout;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payout not found or already closed'; END IF;

  UPDATE public.payments p
  SET payout_status = 'paid'
  WHERE EXISTS (
    SELECT 1 FROM public.settlement_items si
    WHERE si.payment_id = p.id AND si.payout_id = v_payout.id
  );
  RETURN v_payout;
END;
$$;
REVOKE ALL ON FUNCTION public.mark_payout_paid(uuid,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_payout_paid(uuid,text) TO service_role;

-- Atomic API rate-limit buckets prevent concurrent requests from racing the
-- previous count-then-insert implementation.
CREATE TABLE IF NOT EXISTS public.api_rate_limit_buckets (
  api_key_id uuid NOT NULL REFERENCES public.api_keys(id) ON DELETE CASCADE,
  bucket_start timestamptz NOT NULL,
  request_count integer NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  PRIMARY KEY(api_key_id, bucket_start)
);
ALTER TABLE public.api_rate_limit_buckets ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.api_rate_limit_buckets TO service_role;
REVOKE ALL ON public.api_rate_limit_buckets FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.consume_api_rate_limit(
  _api_key_id uuid,
  _request_limit integer,
  _window_seconds integer DEFAULT 60
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bucket timestamptz;
  v_count integer;
BEGIN
  IF _request_limit < 1 OR _window_seconds < 1 OR _window_seconds > 3600 THEN
    RAISE EXCEPTION 'Invalid rate-limit configuration';
  END IF;
  v_bucket := to_timestamp(
    floor(extract(epoch FROM clock_timestamp()) / _window_seconds) * _window_seconds
  );
  INSERT INTO public.api_rate_limit_buckets(api_key_id, bucket_start, request_count)
  VALUES (_api_key_id, v_bucket, 1)
  ON CONFLICT (api_key_id, bucket_start)
  DO UPDATE SET request_count = api_rate_limit_buckets.request_count + 1
  RETURNING request_count INTO v_count;
  RETURN v_count <= _request_limit;
END;
$$;
REVOKE ALL ON FUNCTION public.consume_api_rate_limit(uuid,integer,integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_api_rate_limit(uuid,integer,integer) TO service_role;

-- Transactional notification outbox. The core app records one notification;
-- a trusted dispatcher hands it to the configured email/SMS/push gateway.
CREATE TABLE IF NOT EXISTS public.notification_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid NOT NULL UNIQUE REFERENCES public.notifications(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','processing','sent','dead_letter')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  last_attempt_at timestamptz,
  sent_at timestamptz,
  provider_ref text,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notification_deliveries ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.notification_deliveries TO authenticated;
GRANT ALL ON public.notification_deliveries TO service_role;
CREATE POLICY "Admins read notification deliveries" ON public.notification_deliveries
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
DROP TRIGGER IF EXISTS trg_notification_deliveries_updated ON public.notification_deliveries;
CREATE TRIGGER trg_notification_deliveries_updated
  BEFORE UPDATE ON public.notification_deliveries
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX IF NOT EXISTS notification_deliveries_due_idx
  ON public.notification_deliveries(status, next_attempt_at);

CREATE OR REPLACE FUNCTION public.queue_notification_delivery()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notification_deliveries(notification_id)
  VALUES (NEW.id)
  ON CONFLICT (notification_id) DO NOTHING;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_queue_notification_delivery ON public.notifications;
CREATE TRIGGER trg_queue_notification_delivery
  AFTER INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.queue_notification_delivery();

-- Backfill the outbox for notifications created earlier in this migration or
-- before deployment.
INSERT INTO public.notification_deliveries(notification_id)
SELECT n.id FROM public.notifications n
ON CONFLICT (notification_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.claim_notification_deliveries(_limit integer DEFAULT 25)
RETURNS SETOF public.notification_deliveries
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _limit < 1 OR _limit > 100 THEN RAISE EXCEPTION 'Invalid delivery limit'; END IF;
  RETURN QUERY
  WITH candidates AS (
    SELECT nd.id
    FROM public.notification_deliveries nd
    WHERE (
      nd.status = 'pending' AND nd.next_attempt_at <= now()
    ) OR (
      nd.status = 'processing' AND nd.last_attempt_at < now() - interval '15 minutes'
    )
    ORDER BY nd.next_attempt_at, nd.created_at
    FOR UPDATE SKIP LOCKED
    LIMIT _limit
  )
  UPDATE public.notification_deliveries nd
  SET status = 'processing', attempts = nd.attempts + 1, last_attempt_at = now()
  FROM candidates c
  WHERE nd.id = c.id
  RETURNING nd.*;
END;
$$;
REVOKE ALL ON FUNCTION public.queue_notification_delivery() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_notification_deliveries(integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_notification_deliveries(integer) TO service_role;
