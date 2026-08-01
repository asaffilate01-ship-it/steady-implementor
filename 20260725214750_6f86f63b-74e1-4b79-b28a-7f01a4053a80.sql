
-- ============ RESERVATIONS ============
CREATE TABLE public.reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  plate TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed','cancelled','fulfilled','expired')),
  price_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reservations TO authenticated;
GRANT ALL ON public.reservations TO service_role;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "res_driver_all" ON public.reservations FOR ALL TO authenticated
  USING (driver_id = auth.uid()) WITH CHECK (driver_id = auth.uid());
CREATE POLICY "res_operator_read" ON public.reservations FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.sites s WHERE s.id = reservations.site_id AND public.is_org_member(s.org_id)));
CREATE POLICY "res_admin_all" ON public.reservations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_reservations_updated BEFORE UPDATE ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX idx_reservations_driver ON public.reservations(driver_id, starts_at DESC);
CREATE INDEX idx_reservations_site ON public.reservations(site_id, starts_at);

-- ============ PAYMENTS ============
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL,
  session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  reservation_id UUID REFERENCES public.reservations(id) ON DELETE SET NULL,
  notice_id UUID REFERENCES public.notices(id) ON DELETE SET NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'EUR',
  method TEXT NOT NULL DEFAULT 'wallet' CHECK (method IN ('wallet','card','sepa','apple_pay','google_pay','cash')),
  status TEXT NOT NULL DEFAULT 'paid' CHECK (status IN ('pending','paid','failed','refunded')),
  description TEXT,
  external_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pay_driver_read" ON public.payments FOR SELECT TO authenticated
  USING (driver_id = auth.uid());
CREATE POLICY "pay_driver_insert" ON public.payments FOR INSERT TO authenticated
  WITH CHECK (driver_id = auth.uid());
CREATE POLICY "pay_operator_read" ON public.payments FOR SELECT TO authenticated
  USING (site_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.sites s WHERE s.id = payments.site_id AND public.is_org_member(s.org_id)));
CREATE POLICY "pay_admin_all" ON public.payments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_payments_updated BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX idx_payments_driver ON public.payments(driver_id, created_at DESC);
CREATE INDEX idx_payments_site ON public.payments(site_id, created_at DESC);

-- ============ NOTICES: amount + status ============
ALTER TABLE public.notices
  ADD COLUMN IF NOT EXISTS amount_cents INTEGER NOT NULL DEFAULT 3500,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','paid','waived','contested'));

-- ============ Helper: quote a session ============
CREATE OR REPLACE FUNCTION public.session_amount_cents(_session_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT GREATEST(0, CEIL(
    EXTRACT(EPOCH FROM (COALESCE(sess.ends_at, now()) - sess.started_at)) / 60.0
    * (s.price_cents_per_hour / 60.0)
  ))::INTEGER
  FROM public.sessions sess
  JOIN public.sites s ON s.id = sess.site_id
  WHERE sess.id = _session_id;
$$;
