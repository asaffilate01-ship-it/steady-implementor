-- ParkPunkt v2: atomic product workflows and tariff snapshots.
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS tariff_plan_id uuid REFERENCES public.tariff_plans(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tariff_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE OR REPLACE FUNCTION public.calculate_tariff_quote(
  _rate_cents_per_hour integer,
  _minutes integer,
  _free_minutes integer DEFAULT 0,
  _minimum_charge_cents integer DEFAULT 0,
  _service_fee_cents integer DEFAULT 0,
  _reservation_fee_cents integer DEFAULT 0,
  _daily_cap_cents integer DEFAULT NULL,
  _max_stay_minutes integer DEFAULT NULL,
  _reservation boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_minutes integer := greatest(0, coalesce(_minutes, 0));
  v_chargeable integer;
  v_parking integer;
  v_service integer;
  v_reservation integer;
  v_capped boolean := false;
BEGIN
  v_chargeable := greatest(0, v_minutes - greatest(0, coalesce(_free_minutes, 0)));
  v_parking := CASE
    WHEN v_chargeable = 0 THEN 0
    ELSE round(greatest(0, _rate_cents_per_hour) * v_chargeable / 60.0)
  END;
  IF v_chargeable > 0 THEN
    v_parking := greatest(v_parking, greatest(0, coalesce(_minimum_charge_cents, 0)));
  END IF;
  IF _daily_cap_cents IS NOT NULL AND v_parking > _daily_cap_cents THEN
    v_parking := _daily_cap_cents;
    v_capped := true;
  END IF;
  v_service := CASE WHEN v_chargeable > 0 THEN greatest(0, coalesce(_service_fee_cents, 0)) ELSE 0 END;
  v_reservation := CASE WHEN _reservation THEN greatest(0, coalesce(_reservation_fee_cents, 0)) ELSE 0 END;

  RETURN jsonb_build_object(
    'minutes', v_minutes,
    'chargeable_minutes', v_chargeable,
    'parking_cents', v_parking,
    'service_fee_cents', v_service,
    'reservation_fee_cents', v_reservation,
    'total_cents', v_parking + v_service + v_reservation,
    'capped_by_daily_cap', v_capped,
    'exceeds_max_stay', _max_stay_minutes IS NOT NULL AND v_minutes > _max_stay_minutes
  );
END;
$$;

REVOKE ALL ON FUNCTION public.calculate_tariff_quote(integer,integer,integer,integer,integer,integer,integer,integer,boolean) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.quote_parking_tariff(
  _site_id uuid,
  _minutes integer,
  _reservation boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_site public.sites%ROWTYPE;
  v_plan public.tariff_plans%ROWTYPE;
  v_quote jsonb;
BEGIN
  IF _minutes < 1 OR _minutes > 1440 THEN RAISE EXCEPTION 'Invalid parking duration'; END IF;
  SELECT * INTO v_site FROM public.sites WHERE id = _site_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Site not found'; END IF;
  SELECT * INTO v_plan FROM public.tariff_plans
    WHERE site_id = _site_id AND active
    ORDER BY updated_at DESC LIMIT 1;

  v_quote := public.calculate_tariff_quote(
    v_site.price_cents_per_hour,
    _minutes,
    coalesce(v_plan.free_minutes, 0),
    coalesce(v_plan.minimum_charge_cents, 0),
    coalesce(v_plan.service_fee_cents, 0),
    coalesce(v_plan.reservation_fee_cents, 0),
    v_plan.daily_cap_cents,
    v_plan.max_stay_minutes,
    _reservation
  );
  RETURN v_quote || jsonb_build_object(
    'site_id', v_site.id,
    'tariff_plan_id', v_plan.id,
    'currency', coalesce(v_plan.currency, 'EUR'),
    'rate_cents_per_hour', v_site.price_cents_per_hour,
    'free_minutes', coalesce(v_plan.free_minutes, 0),
    'minimum_charge_cents', coalesce(v_plan.minimum_charge_cents, 0),
    'daily_cap_cents', v_plan.daily_cap_cents,
    'max_stay_minutes', v_plan.max_stay_minutes
  );
END;
$$;

REVOKE ALL ON FUNCTION public.quote_parking_tariff(uuid,integer,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.quote_parking_tariff(uuid,integer,boolean) TO anon, authenticated, service_role;

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
  v_quote jsonb;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  IF _minutes < 5 OR _minutes > 1440 THEN RAISE EXCEPTION 'Duration must be between 5 minutes and 24 hours'; END IF;
  IF length(v_plate) < 2 OR length(v_plate) > 16 THEN RAISE EXCEPTION 'Invalid registration plate'; END IF;

  SELECT * INTO v_site FROM public.sites WHERE id = _site_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Site not found'; END IF;
  IF v_site.occupied >= v_site.capacity THEN RAISE EXCEPTION 'No spaces currently available'; END IF;
  IF EXISTS (SELECT 1 FROM public.sessions WHERE user_id = v_uid AND plate = v_plate AND status = 'active') THEN
    RAISE EXCEPTION 'This vehicle already has an active session';
  END IF;

  v_quote := public.quote_parking_tariff(v_site.id, _minutes, false);
  IF coalesce((v_quote->>'exceeds_max_stay')::boolean, false) THEN RAISE EXCEPTION 'Maximum stay exceeded'; END IF;

  INSERT INTO public.sessions (
    user_id, site_id, plate, started_at, ends_at, price_cents_per_hour,
    amount_cents, payment_method, status, tariff_plan_id, tariff_snapshot
  ) VALUES (
    v_uid, v_site.id, v_plate, v_now, v_now + make_interval(mins => _minutes),
    v_site.price_cents_per_hour, (v_quote->>'total_cents')::integer,
    CASE WHEN _payment_method IN ('wallet','card','sepa','apple_pay','google_pay','cash') THEN _payment_method ELSE 'wallet' END,
    'active', nullif(v_quote->>'tariff_plan_id', '')::uuid, v_quote
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
  v_total_minutes integer;
  v_snapshot jsonb;
  v_quote jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  IF _minutes < 5 OR _minutes > 480 THEN RAISE EXCEPTION 'Invalid extension'; END IF;
  SELECT * INTO v_session FROM public.sessions
    WHERE id = _session_id AND user_id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Session not found'; END IF;
  IF v_session.status <> 'active' THEN RAISE EXCEPTION 'Session is not active'; END IF;

  v_total_minutes := ceil(extract(epoch FROM (v_session.ends_at + make_interval(mins => _minutes) - v_session.started_at)) / 60.0)::integer;
  IF v_total_minutes > 1440 THEN RAISE EXCEPTION 'Maximum stay is 24 hours'; END IF;
  v_snapshot := v_session.tariff_snapshot;
  v_quote := public.calculate_tariff_quote(
    v_session.price_cents_per_hour, v_total_minutes,
    coalesce((v_snapshot->>'free_minutes')::integer, 0),
    coalesce((v_snapshot->>'minimum_charge_cents')::integer, 0),
    coalesce((v_snapshot->>'service_fee_cents')::integer, 0),
    coalesce((v_snapshot->>'reservation_fee_cents')::integer, 0),
    (v_snapshot->>'daily_cap_cents')::integer,
    (v_snapshot->>'max_stay_minutes')::integer,
    false
  );
  IF coalesce((v_quote->>'exceeds_max_stay')::boolean, false) THEN RAISE EXCEPTION 'Maximum stay exceeded'; END IF;

  UPDATE public.sessions SET
    ends_at = ends_at + make_interval(mins => _minutes),
    amount_cents = (v_quote->>'total_cents')::integer,
    tariff_snapshot = v_snapshot || jsonb_build_object('latest_quote', v_quote)
  WHERE id = _session_id RETURNING * INTO v_session;
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
  v_snapshot jsonb;
  v_quote jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  SELECT * INTO v_session FROM public.sessions
    WHERE id = _session_id AND user_id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Session not found'; END IF;

  IF v_session.status = 'ended' THEN
    SELECT * INTO v_payment FROM public.payments WHERE session_id = v_session.id LIMIT 1;
    RETURN jsonb_build_object('minutes', greatest(1, ceil(extract(epoch FROM (v_session.ends_at - v_session.started_at)) / 60.0)::integer), 'amount_cents', v_session.amount_cents, 'payment_id', v_payment.id, 'payment_status', v_payment.status);
  END IF;
  IF v_session.status <> 'active' THEN RAISE EXCEPTION 'Session cannot be ended'; END IF;

  v_minutes := greatest(1, ceil(extract(epoch FROM (v_now - v_session.started_at)) / 60.0)::integer);
  v_snapshot := v_session.tariff_snapshot;
  v_quote := public.calculate_tariff_quote(
    v_session.price_cents_per_hour, v_minutes,
    coalesce((v_snapshot->>'free_minutes')::integer, 0),
    coalesce((v_snapshot->>'minimum_charge_cents')::integer, 0),
    coalesce((v_snapshot->>'service_fee_cents')::integer, 0),
    coalesce((v_snapshot->>'reservation_fee_cents')::integer, 0),
    (v_snapshot->>'daily_cap_cents')::integer,
    (v_snapshot->>'max_stay_minutes')::integer,
    false
  );
  v_amount := (v_quote->>'total_cents')::integer;

  UPDATE public.sessions SET status = 'ended', ends_at = v_now, amount_cents = v_amount,
    tariff_snapshot = v_snapshot || jsonb_build_object('final_quote', v_quote)
  WHERE id = v_session.id RETURNING * INTO v_session;

  INSERT INTO public.payments (driver_id, site_id, session_id, amount_cents, method, status, description, metadata)
  VALUES (
    auth.uid(), v_session.site_id, v_session.id, v_amount,
    CASE WHEN v_session.payment_method IN ('wallet','card','sepa','apple_pay','google_pay','cash') THEN v_session.payment_method ELSE 'wallet' END,
    'pending', 'Parking session · ' || v_minutes || ' min',
    jsonb_build_object('tariff_quote', v_quote, 'tariff_plan_id', v_session.tariff_plan_id)
  )
  ON CONFLICT (session_id) WHERE session_id IS NOT NULL DO UPDATE
    SET amount_cents = EXCLUDED.amount_cents, metadata = EXCLUDED.metadata
  RETURNING * INTO v_payment;

  RETURN jsonb_build_object('minutes', v_minutes, 'amount_cents', v_amount, 'payment_id', v_payment.id, 'payment_status', v_payment.status, 'tariff_quote', v_quote);
END;
$$;

CREATE OR REPLACE FUNCTION public.create_business_account_secure(
  _name text,
  _billing_email text DEFAULT NULL,
  _monthly_limit_cents integer DEFAULT 0
)
RETURNS public.business_accounts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account public.business_accounts%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  IF length(trim(_name)) < 2 OR length(trim(_name)) > 120 THEN RAISE EXCEPTION 'Invalid business name'; END IF;
  IF _monthly_limit_cents < 0 OR _monthly_limit_cents > 100000000 THEN RAISE EXCEPTION 'Invalid monthly limit'; END IF;
  INSERT INTO public.business_accounts(name, owner_user_id, billing_email, monthly_limit_cents)
  VALUES (trim(_name), auth.uid(), nullif(lower(trim(_billing_email)), ''), _monthly_limit_cents)
  RETURNING * INTO v_account;
  INSERT INTO public.business_members(account_id, user_id, role)
  VALUES (v_account.id, auth.uid(), 'owner');
  INSERT INTO public.audit_events(actor_user_id, action, entity_type, entity_id)
  VALUES (auth.uid(), 'business.account_created', 'business_account', v_account.id::text);
  RETURN v_account;
END;
$$;

CREATE OR REPLACE FUNCTION public.save_business_cost_centre_secure(
  _account_id uuid,
  _code text,
  _name text,
  _budget_cents integer DEFAULT 0
)
RETURNS public.cost_centres
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_centre public.cost_centres%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_business_manager(_account_id) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF length(trim(_code)) < 1 OR length(trim(_code)) > 32 THEN RAISE EXCEPTION 'Invalid cost centre code'; END IF;
  IF length(trim(_name)) < 2 OR length(trim(_name)) > 120 THEN RAISE EXCEPTION 'Invalid cost centre name'; END IF;
  IF _budget_cents < 0 OR _budget_cents > 100000000 THEN RAISE EXCEPTION 'Invalid budget'; END IF;
  INSERT INTO public.cost_centres(account_id, code, name, budget_cents)
  VALUES (_account_id, upper(trim(_code)), trim(_name), _budget_cents)
  ON CONFLICT (account_id, code) DO UPDATE SET name = excluded.name, budget_cents = excluded.budget_cents, updated_at = now()
  RETURNING * INTO v_centre;
  RETURN v_centre;
END;
$$;

CREATE OR REPLACE FUNCTION public.save_tariff_plan_secure(
  _id uuid,
  _site_id uuid,
  _name text,
  _free_minutes integer,
  _minimum_charge_cents integer,
  _service_fee_cents integer,
  _reservation_fee_cents integer,
  _daily_cap_cents integer,
  _max_stay_minutes integer
)
RETURNS public.tariff_plans
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_plan public.tariff_plans%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  IF NOT public.has_role(auth.uid(), 'admin') AND NOT EXISTS (
    SELECT 1 FROM public.sites s WHERE s.id = _site_id AND s.org_id IS NOT NULL AND public.is_operator_org_member(s.org_id)
  ) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF least(_free_minutes, _minimum_charge_cents, _service_fee_cents, _reservation_fee_cents) < 0 THEN RAISE EXCEPTION 'Tariff values cannot be negative'; END IF;
  IF _daily_cap_cents IS NOT NULL AND _daily_cap_cents < 0 THEN RAISE EXCEPTION 'Invalid daily cap'; END IF;
  IF _max_stay_minutes IS NOT NULL AND (_max_stay_minutes < 5 OR _max_stay_minutes > 1440) THEN RAISE EXCEPTION 'Invalid maximum stay'; END IF;

  UPDATE public.tariff_plans SET active = false, updated_at = now()
    WHERE site_id = _site_id AND active AND (_id IS NULL OR id <> _id);
  IF _id IS NULL THEN
    INSERT INTO public.tariff_plans(site_id, name, free_minutes, minimum_charge_cents, service_fee_cents, reservation_fee_cents, daily_cap_cents, max_stay_minutes, active)
    VALUES (_site_id, trim(_name), _free_minutes, _minimum_charge_cents, _service_fee_cents, _reservation_fee_cents, _daily_cap_cents, _max_stay_minutes, true)
    RETURNING * INTO v_plan;
  ELSE
    UPDATE public.tariff_plans SET name = trim(_name), free_minutes = _free_minutes,
      minimum_charge_cents = _minimum_charge_cents, service_fee_cents = _service_fee_cents,
      reservation_fee_cents = _reservation_fee_cents, daily_cap_cents = _daily_cap_cents,
      max_stay_minutes = _max_stay_minutes, active = true, updated_at = now()
    WHERE id = _id AND site_id = _site_id RETURNING * INTO v_plan;
    IF NOT FOUND THEN RAISE EXCEPTION 'Tariff plan not found'; END IF;
  END IF;
  INSERT INTO public.audit_events(actor_user_id, org_id, action, entity_type, entity_id, metadata)
  SELECT auth.uid(), s.org_id, 'tariff.updated', 'tariff_plan', v_plan.id::text, jsonb_build_object('site_id', _site_id)
  FROM public.sites s WHERE s.id = _site_id;
  RETURN v_plan;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_support_case_secure(
  _subject text,
  _category text,
  _body text,
  _reference_type text DEFAULT NULL,
  _reference_id text DEFAULT NULL
)
RETURNS public.support_cases
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_case public.support_cases%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  IF length(trim(_subject)) < 3 OR length(trim(_subject)) > 160 THEN RAISE EXCEPTION 'Invalid subject'; END IF;
  IF _category NOT IN ('payment','session','notice','account','site','other') THEN RAISE EXCEPTION 'Invalid category'; END IF;
  IF length(trim(_body)) < 10 OR length(trim(_body)) > 8000 THEN RAISE EXCEPTION 'Invalid message'; END IF;
  INSERT INTO public.support_cases(user_id, subject, category, reference_type, reference_id)
  VALUES (auth.uid(), trim(_subject), _category, nullif(trim(_reference_type), ''), nullif(trim(_reference_id), ''))
  RETURNING * INTO v_case;
  INSERT INTO public.support_messages(case_id, author_id, body)
  VALUES (v_case.id, auth.uid(), trim(_body));
  RETURN v_case;
END;
$$;

REVOKE ALL ON FUNCTION public.create_business_account_secure(text,text,integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.save_business_cost_centre_secure(uuid,text,text,integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.save_tariff_plan_secure(uuid,uuid,text,integer,integer,integer,integer,integer,integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_support_case_secure(text,text,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_business_account_secure(text,text,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_business_cost_centre_secure(uuid,text,text,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_tariff_plan_secure(uuid,uuid,text,integer,integer,integer,integer,integer,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_support_case_secure(text,text,text,text,text) TO authenticated;

-- Force writes through the validated transactional workflows above. Reads remain RLS-scoped.
REVOKE INSERT, UPDATE, DELETE ON public.business_accounts FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.business_members FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.cost_centres FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.tariff_plans FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.support_cases FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.support_messages FROM authenticated;
GRANT SELECT ON public.business_accounts, public.business_members, public.cost_centres,
  public.tariff_plans, public.support_cases, public.support_messages TO authenticated;