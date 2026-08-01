-- ParkPunkt production foundation
-- Financial/session mutations are performed by narrowly scoped RPCs so clients
-- can no longer choose prices, payment state, ownership or organisation IDs.

-- The previously installed job used the public Supabase key as a cron secret.
-- Disable it. Production scheduling must call the endpoint with
-- PARKPUNKT_CRON_SECRET from a trusted scheduler.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'parkpunkt-sync-providers') THEN
    PERFORM cron.unschedule('parkpunkt-sync-providers');
  END IF;
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

-- Production admins must be provisioned through a controlled service-role
-- bootstrap, never awarded to whichever public user happens to register first.
DROP TRIGGER IF EXISTS on_auth_user_bootstrap_admin ON auth.users;
REVOKE ALL ON FUNCTION public.bootstrap_first_admin() FROM PUBLIC, anon, authenticated;

ALTER TABLE public.sites
  DROP CONSTRAINT IF EXISTS sites_occupied_within_capacity;
ALTER TABLE public.sites
  ADD CONSTRAINT sites_occupied_within_capacity CHECK (occupied <= capacity) NOT VALID;

ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_status_check;
ALTER TABLE public.payments
  ADD CONSTRAINT payments_status_check
  CHECK (status IN ('pending','authorized','paid','failed','cancelled','refunded'));

-- Existing demo/provider sites predate organisation ownership. Backfill an
-- operator organisation per advertised operator so the new tenant-scoped
-- policies do not strand those records.
INSERT INTO public.orgs (name, kind)
SELECT DISTINCT trim(s.operator_name), 'operator'::public.org_kind
FROM public.sites s
WHERE NULLIF(trim(s.operator_name), '') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.orgs o
    WHERE o.kind = 'operator'
      AND lower(o.name) = lower(trim(s.operator_name))
  );

UPDATE public.sites s
SET org_id = o.id
FROM public.orgs o
WHERE s.org_id IS NULL
  AND o.kind = 'operator'
  AND lower(o.name) = lower(trim(s.operator_name));

CREATE UNIQUE INDEX IF NOT EXISTS payments_one_per_session
  ON public.payments(session_id) WHERE session_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS payments_one_per_reservation
  ON public.payments(reservation_id) WHERE reservation_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS payments_one_per_notice
  ON public.payments(notice_id) WHERE notice_id IS NOT NULL AND status <> 'failed';

CREATE OR REPLACE FUNCTION public.is_operator_org_member(_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.orgs o ON o.id = ur.org_id
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'operator'
      AND ur.org_id = _org_id
      AND o.kind = 'operator'
  );
$$;

REVOKE ALL ON FUNCTION public.is_operator_org_member(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_operator_org_member(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.is_org_member(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_org_member(uuid) TO authenticated;

-- Fee configuration is commercially sensitive. Only trusted server/trigger
-- code needs to calculate a split; public quote requests reach it through the
-- authenticated API-key endpoint.
REVOKE ALL ON FUNCTION public.calculate_platform_fee(integer,uuid,uuid,uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_platform_fee(integer,uuid,uuid,uuid)
  TO service_role;

-- Profiles may update only driver-owned columns, never org_id.
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (display_name, phone, plate, payment_method) ON public.profiles TO authenticated;

-- Administrative writes use authenticated server functions backed by the
-- service role. Removing browser write access prevents dashboard controls
-- from being bypassed through the REST API.
DROP POLICY IF EXISTS "Admins can grant roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can revoke roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM authenticated;

DROP POLICY IF EXISTS "providers_admin_write" ON public.providers;
DROP POLICY IF EXISTS "provider_creds_admin" ON public.provider_credentials;
DROP POLICY IF EXISTS "site_map_write" ON public.site_provider_mapping;
REVOKE INSERT, UPDATE, DELETE ON public.providers FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.provider_credentials FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.site_provider_mapping FROM authenticated;

DROP POLICY IF EXISTS "api_keys_admin_all" ON public.api_keys;
DROP POLICY IF EXISTS "api_keys_owner_insert" ON public.api_keys;
DROP POLICY IF EXISTS "api_keys_owner_update" ON public.api_keys;
CREATE POLICY "api_keys_admin_read" ON public.api_keys FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
REVOKE INSERT, UPDATE, DELETE ON public.api_keys FROM authenticated;
REVOKE SELECT ON public.api_keys FROM authenticated;
GRANT SELECT (
  id, provider_id, owner_user_id, name, key_prefix, scopes,
  last_used_at, revoked_at, created_at
) ON public.api_keys TO authenticated;

DROP POLICY IF EXISTS "Admins/operators insert sites" ON public.sites;
DROP POLICY IF EXISTS "Admins/operators update sites" ON public.sites;
DROP POLICY IF EXISTS "Admins/operators delete sites" ON public.sites;

-- Direct session/payment/reservation writes are replaced by RPCs below.
DROP POLICY IF EXISTS "Driver creates own session" ON public.sessions;
DROP POLICY IF EXISTS "Driver updates own session" ON public.sessions;
DROP POLICY IF EXISTS "Admin/operator updates any session" ON public.sessions;
DROP POLICY IF EXISTS "pay_driver_insert" ON public.payments;
DROP POLICY IF EXISTS "res_driver_all" ON public.reservations;
DROP POLICY IF EXISTS "res_admin_all" ON public.reservations;

CREATE POLICY "res_driver_read" ON public.reservations FOR SELECT TO authenticated
  USING (driver_id = auth.uid());
CREATE POLICY "res_admin_read" ON public.reservations FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Operator sees sessions at own sites" ON public.sessions;
CREATE POLICY "Operator sees sessions at own sites" ON public.sessions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sites s
      WHERE s.id = sessions.site_id
        AND s.org_id IS NOT NULL
        AND public.is_operator_org_member(s.org_id)
    )
  );

-- Enforcement checks are intentionally exposed through a minimal RPC below;
-- they do not need bulk access to every driver's session record.
DROP POLICY IF EXISTS "Admin/enforcement see all sessions" ON public.sessions;
CREATE POLICY "Admin sees all sessions" ON public.sessions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "pay_operator_read" ON public.payments;
CREATE POLICY "pay_operator_read" ON public.payments FOR SELECT TO authenticated
  USING (
    site_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.sites s
      WHERE s.id = payments.site_id
        AND s.org_id IS NOT NULL
        AND public.is_operator_org_member(s.org_id)
    )
  );

DROP POLICY IF EXISTS "pay_admin_all" ON public.payments;
CREATE POLICY "pay_admin_read" ON public.payments FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "res_operator_read" ON public.reservations;
CREATE POLICY "res_operator_read" ON public.reservations FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sites s
      WHERE s.id = reservations.site_id
        AND s.org_id IS NOT NULL
        AND public.is_operator_org_member(s.org_id)
    )
  );

-- A driver changing their profile plate must not reveal another person's notice.
DROP POLICY IF EXISTS "Driver sees notices for own plate" ON public.notices;
DROP POLICY IF EXISTS "Enforcement/admin issue notices" ON public.notices;
DROP POLICY IF EXISTS "Operator sees notices for own sites" ON public.notices;
CREATE POLICY "Operator sees notices for own sites" ON public.notices FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sites s
      WHERE s.id = notices.site_id
        AND s.org_id IS NOT NULL
        AND public.is_operator_org_member(s.org_id)
    )
  );

CREATE OR REPLACE FUNCTION public.get_operator_sites()
RETURNS SETOF public.sites
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.*
  FROM public.sites s
  WHERE public.has_role(auth.uid(), 'admin')
     OR (s.org_id IS NOT NULL AND public.is_operator_org_member(s.org_id))
  ORDER BY s.name;
$$;

CREATE OR REPLACE FUNCTION public.create_operator_site(
  _name text,
  _address text,
  _lat double precision,
  _lng double precision,
  _capacity integer,
  _price_cents_per_hour integer,
  _operator_name text,
  _type public.site_type DEFAULT 'lot',
  _amenities text[] DEFAULT '{}'
)
RETURNS public.sites
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_site public.sites%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  IF trim(_name) = '' OR trim(_address) = '' THEN RAISE EXCEPTION 'Name and address are required'; END IF;
  IF _lat NOT BETWEEN -90 AND 90 OR _lng NOT BETWEEN -180 AND 180 THEN RAISE EXCEPTION 'Invalid coordinates'; END IF;
  IF _capacity < 1 OR _price_cents_per_hour < 0 THEN RAISE EXCEPTION 'Invalid capacity or tariff'; END IF;

  IF public.has_role(auth.uid(), 'admin') THEN
    SELECT id INTO v_org_id FROM public.orgs WHERE kind = 'operator' ORDER BY created_at LIMIT 1;
  ELSE
    SELECT ur.org_id INTO v_org_id
    FROM public.user_roles ur
    JOIN public.orgs o ON o.id = ur.org_id AND o.kind = 'operator'
    WHERE ur.user_id = auth.uid() AND ur.role = 'operator'
    ORDER BY ur.created_at
    LIMIT 1;
  END IF;
  IF v_org_id IS NULL THEN RAISE EXCEPTION 'No operator organisation assigned'; END IF;

  INSERT INTO public.sites (
    org_id, name, address, lat, lng, capacity, occupied,
    price_cents_per_hour, type, amenities, operator_name
  ) VALUES (
    v_org_id, trim(_name), trim(_address), _lat, _lng, _capacity, 0,
    _price_cents_per_hour, _type, COALESCE(_amenities, '{}'), NULLIF(trim(_operator_name), '')
  ) RETURNING * INTO v_site;
  RETURN v_site;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_operator_site(
  _site_id uuid,
  _price_cents_per_hour integer DEFAULT NULL,
  _occupied integer DEFAULT NULL
)
RETURNS public.sites
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_site public.sites%ROWTYPE;
BEGIN
  SELECT * INTO v_site FROM public.sites WHERE id = _site_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Site not found'; END IF;
  IF NOT public.has_role(auth.uid(), 'admin')
     AND (v_site.org_id IS NULL OR NOT public.is_operator_org_member(v_site.org_id)) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  IF _price_cents_per_hour IS NOT NULL AND _price_cents_per_hour < 0 THEN RAISE EXCEPTION 'Invalid tariff'; END IF;
  IF _occupied IS NOT NULL AND (_occupied < 0 OR _occupied > v_site.capacity) THEN RAISE EXCEPTION 'Invalid occupancy'; END IF;

  UPDATE public.sites
  SET price_cents_per_hour = COALESCE(_price_cents_per_hour, price_cents_per_hour),
      occupied = COALESCE(_occupied, occupied)
  WHERE id = _site_id
  RETURNING * INTO v_site;
  RETURN v_site;
END;
$$;

CREATE OR REPLACE FUNCTION public.start_parking_session(
  _site_id uuid,
  _minutes integer,
  _plate text,
  _payment_method text DEFAULT NULL
)
RETURNS public.sessions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_site public.sites%ROWTYPE;
  v_session public.sessions%ROWTYPE;
  v_plate text := upper(trim(_plate));
  v_now timestamptz := now();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  IF _minutes < 5 OR _minutes > 1440 THEN RAISE EXCEPTION 'Duration must be between 5 minutes and 24 hours'; END IF;
  IF length(v_plate) < 2 OR length(v_plate) > 16 THEN RAISE EXCEPTION 'Invalid registration plate'; END IF;

  SELECT * INTO v_site FROM public.sites WHERE id = _site_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Site not found'; END IF;
  IF v_site.occupied >= v_site.capacity THEN RAISE EXCEPTION 'No spaces currently available'; END IF;
  IF EXISTS (
    SELECT 1 FROM public.sessions
    WHERE user_id = v_uid AND plate = v_plate AND status = 'active'
  ) THEN RAISE EXCEPTION 'This vehicle already has an active session'; END IF;

  INSERT INTO public.sessions (
    user_id, site_id, plate, started_at, ends_at, price_cents_per_hour,
    amount_cents, payment_method, status
  ) VALUES (
    v_uid, v_site.id, v_plate, v_now, v_now + make_interval(mins => _minutes),
    v_site.price_cents_per_hour,
    round(v_site.price_cents_per_hour * _minutes / 60.0),
    CASE WHEN _payment_method IN ('wallet','card','sepa','apple_pay','google_pay','cash') THEN _payment_method ELSE 'wallet' END,
    'active'
  ) RETURNING * INTO v_session;
  RETURN v_session;
END;
$$;

CREATE OR REPLACE FUNCTION public.extend_parking_session(_session_id uuid, _minutes integer)
RETURNS public.sessions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session public.sessions%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  IF _minutes < 5 OR _minutes > 480 THEN RAISE EXCEPTION 'Invalid extension'; END IF;
  SELECT * INTO v_session
  FROM public.sessions
  WHERE id = _session_id AND user_id = auth.uid()
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Session not found'; END IF;
  IF v_session.status <> 'active' THEN RAISE EXCEPTION 'Session is not active'; END IF;
  IF v_session.ends_at + make_interval(mins => _minutes) > v_session.started_at + interval '24 hours' THEN
    RAISE EXCEPTION 'Maximum stay is 24 hours';
  END IF;
  UPDATE public.sessions
  SET ends_at = ends_at + make_interval(mins => _minutes),
      amount_cents = amount_cents + round(price_cents_per_hour * _minutes / 60.0)
  WHERE id = _session_id
  RETURNING * INTO v_session;
  RETURN v_session;
END;
$$;

CREATE OR REPLACE FUNCTION public.end_parking_session(_session_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session public.sessions%ROWTYPE;
  v_payment public.payments%ROWTYPE;
  v_now timestamptz := now();
  v_minutes integer;
  v_amount integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  SELECT * INTO v_session
  FROM public.sessions
  WHERE id = _session_id AND user_id = auth.uid()
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Session not found'; END IF;

  IF v_session.status = 'ended' THEN
    SELECT * INTO v_payment FROM public.payments WHERE session_id = v_session.id LIMIT 1;
    RETURN jsonb_build_object(
      'minutes', GREATEST(1, ceil(extract(epoch FROM (v_session.ends_at - v_session.started_at)) / 60.0)::integer),
      'amount_cents', v_session.amount_cents,
      'payment_id', v_payment.id,
      'payment_status', v_payment.status
    );
  END IF;
  IF v_session.status <> 'active' THEN RAISE EXCEPTION 'Session cannot be ended'; END IF;

  v_minutes := GREATEST(1, ceil(extract(epoch FROM (v_now - v_session.started_at)) / 60.0)::integer);
  v_amount := round(v_session.price_cents_per_hour * v_minutes / 60.0);
  UPDATE public.sessions
  SET status = 'ended', ends_at = v_now, amount_cents = v_amount
  WHERE id = v_session.id
  RETURNING * INTO v_session;

  INSERT INTO public.payments (
    driver_id, site_id, session_id, amount_cents, method, status, description
  ) VALUES (
    auth.uid(), v_session.site_id, v_session.id, v_amount,
    CASE WHEN v_session.payment_method IN ('wallet','card','sepa','apple_pay','google_pay','cash') THEN v_session.payment_method ELSE 'wallet' END,
    'pending', 'Parking session · ' || v_minutes || ' min'
  )
  ON CONFLICT (session_id) WHERE session_id IS NOT NULL DO UPDATE
    SET amount_cents = EXCLUDED.amount_cents
  RETURNING * INTO v_payment;

  RETURN jsonb_build_object(
    'minutes', v_minutes,
    'amount_cents', v_amount,
    'payment_id', v_payment.id,
    'payment_status', v_payment.status
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.create_parking_reservation(
  _site_id uuid,
  _plate text,
  _starts_at timestamptz,
  _minutes integer
)
RETURNS public.reservations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_site public.sites%ROWTYPE;
  v_res public.reservations%ROWTYPE;
  v_end timestamptz;
  v_reserved integer;
  v_plate text := upper(trim(_plate));
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  IF _minutes < 15 OR _minutes > 1440 THEN RAISE EXCEPTION 'Invalid reservation duration'; END IF;
  IF _starts_at < now() OR _starts_at > now() + interval '365 days' THEN RAISE EXCEPTION 'Invalid reservation start'; END IF;
  IF length(v_plate) < 2 OR length(v_plate) > 16 THEN RAISE EXCEPTION 'Invalid registration plate'; END IF;
  v_end := _starts_at + make_interval(mins => _minutes);
  SELECT * INTO v_site FROM public.sites WHERE id = _site_id FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Site not found'; END IF;
  SELECT count(*) INTO v_reserved
  FROM public.reservations
  WHERE site_id = _site_id AND status = 'confirmed'
    AND starts_at < v_end AND ends_at > _starts_at;
  IF v_reserved >= v_site.capacity THEN RAISE EXCEPTION 'No reservable spaces for this time'; END IF;

  INSERT INTO public.reservations (
    driver_id, site_id, plate, starts_at, ends_at, status, price_cents, currency
  ) VALUES (
    auth.uid(), v_site.id, v_plate, _starts_at, v_end, 'confirmed',
    round(v_site.price_cents_per_hour * _minutes / 60.0), 'EUR'
  ) RETURNING * INTO v_res;

  INSERT INTO public.payments (
    driver_id, site_id, reservation_id, amount_cents, method, status, description
  ) VALUES (
    auth.uid(), v_site.id, v_res.id, v_res.price_cents, 'card', 'pending',
    'Reservation · ' || v_site.name
  );
  RETURN v_res;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_parking_reservation(_reservation_id uuid)
RETURNS public.reservations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_res public.reservations%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  SELECT * INTO v_res
  FROM public.reservations
  WHERE id = _reservation_id AND driver_id = auth.uid()
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Reservation not found'; END IF;
  IF v_res.status <> 'confirmed' THEN RETURN v_res; END IF;
  IF v_res.starts_at <= now() THEN RAISE EXCEPTION 'A started reservation cannot be cancelled'; END IF;
  UPDATE public.reservations SET status = 'cancelled' WHERE id = v_res.id RETURNING * INTO v_res;
  UPDATE public.payments SET status = 'cancelled'
  WHERE reservation_id = v_res.id AND status IN ('pending','authorized');
  RETURN v_res;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_parking_session(_site_id uuid, _plate text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session public.sessions%ROWTYPE;
  v_plate text := upper(trim(_plate));
BEGIN
  IF auth.uid() IS NULL OR NOT (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'enforcement')
  ) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF length(v_plate) < 2 OR length(v_plate) > 16 THEN RAISE EXCEPTION 'Invalid registration plate'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.sites WHERE id = _site_id) THEN RAISE EXCEPTION 'Site not found'; END IF;

  SELECT * INTO v_session
  FROM public.sessions
  WHERE site_id = _site_id
    AND plate = v_plate
    AND status = 'active'
    AND ends_at > now()
  ORDER BY ends_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'invalid');
  END IF;
  RETURN jsonb_build_object(
    'status', 'valid',
    'session_id', v_session.id,
    'ends_at', v_session.ends_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.issue_parking_notice(
  _site_id uuid,
  _plate text,
  _reason text,
  _amount_cents integer
)
RETURNS public.notices
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_notice public.notices%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'enforcement')
  ) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.sites WHERE id = _site_id) THEN RAISE EXCEPTION 'Site not found'; END IF;
  IF length(trim(_plate)) < 2 OR length(trim(_plate)) > 16 THEN RAISE EXCEPTION 'Invalid registration plate'; END IF;
  IF length(trim(_reason)) < 3 OR _amount_cents < 0 OR _amount_cents > 100000 THEN RAISE EXCEPTION 'Invalid notice'; END IF;
  INSERT INTO public.notices(site_id, plate, reason, amount_cents, issued_by, status)
  VALUES (_site_id, upper(trim(_plate)), trim(_reason), _amount_cents, auth.uid(), 'open')
  RETURNING * INTO v_notice;
  RETURN v_notice;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_parking_notice_status(_notice_id uuid, _status text)
RETURNS public.notices
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_notice public.notices%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'enforcement')
  ) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF _status NOT IN ('waived','contested') THEN RAISE EXCEPTION 'Unsupported manual status'; END IF;
  UPDATE public.notices SET status = _status WHERE id = _notice_id RETURNING * INTO v_notice;
  IF NOT FOUND THEN RAISE EXCEPTION 'Notice not found'; END IF;
  RETURN v_notice;
END;
$$;

REVOKE ALL ON FUNCTION public.get_operator_sites() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_operator_site(text,text,double precision,double precision,integer,integer,text,public.site_type,text[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_operator_site(uuid,integer,integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.start_parking_session(uuid,integer,text,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.extend_parking_session(uuid,integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.end_parking_session(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_parking_reservation(uuid,text,timestamptz,integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cancel_parking_reservation(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.check_parking_session(uuid,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.issue_parking_notice(uuid,text,text,integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_parking_notice_status(uuid,text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.get_operator_sites() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_operator_site(text,text,double precision,double precision,integer,integer,text,public.site_type,text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_operator_site(uuid,integer,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.start_parking_session(uuid,integer,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.extend_parking_session(uuid,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.end_parking_session(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_parking_reservation(uuid,text,timestamptz,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_parking_reservation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_parking_session(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.issue_parking_notice(uuid,text,text,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_parking_notice_status(uuid,text) TO authenticated;
