
-- Enum for site types
CREATE TYPE public.site_type AS ENUM ('street', 'garage', 'lot');
CREATE TYPE public.session_status AS ENUM ('active', 'ended', 'cancelled');

-- Extend profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plate TEXT,
  ADD COLUMN IF NOT EXISTS payment_method TEXT;

-- Helper: is caller a member of the given org
CREATE OR REPLACE FUNCTION public.is_org_member(_org_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND org_id = _org_id
  );
$$;

-- updated_at helper (idempotent)
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- =========================================================
-- sites
-- =========================================================
CREATE TABLE public.sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.orgs(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  capacity INTEGER NOT NULL CHECK (capacity >= 0),
  occupied INTEGER NOT NULL DEFAULT 0 CHECK (occupied >= 0),
  price_cents_per_hour INTEGER NOT NULL CHECK (price_cents_per_hour >= 0),
  type public.site_type NOT NULL DEFAULT 'garage',
  amenities TEXT[] NOT NULL DEFAULT '{}',
  operator_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.sites TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sites TO authenticated;
GRANT ALL ON public.sites TO service_role;

ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sites are public" ON public.sites FOR SELECT USING (true);
CREATE POLICY "Admins/operators insert sites" ON public.sites FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR (org_id IS NOT NULL AND public.is_org_member(org_id)));
CREATE POLICY "Admins/operators update sites" ON public.sites FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR (org_id IS NOT NULL AND public.is_org_member(org_id)))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR (org_id IS NOT NULL AND public.is_org_member(org_id)));
CREATE POLICY "Admins/operators delete sites" ON public.sites FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR (org_id IS NOT NULL AND public.is_org_member(org_id)));

CREATE TRIGGER trg_sites_updated BEFORE UPDATE ON public.sites
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =========================================================
-- sessions
-- =========================================================
CREATE TABLE public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE RESTRICT,
  plate TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ NOT NULL,
  price_cents_per_hour INTEGER NOT NULL,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  payment_method TEXT,
  status public.session_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sessions TO authenticated;
GRANT ALL ON public.sessions TO service_role;

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Driver sees own sessions" ON public.sessions FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Admin/enforcement see all sessions" ON public.sessions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'enforcement'));
CREATE POLICY "Operator sees sessions at own sites" ON public.sessions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.sites s WHERE s.id = site_id AND s.org_id IS NOT NULL AND public.is_org_member(s.org_id)));
CREATE POLICY "Driver creates own session" ON public.sessions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Driver updates own session" ON public.sessions FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admin/operator updates any session" ON public.sessions FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR EXISTS (SELECT 1 FROM public.sites s WHERE s.id = site_id AND s.org_id IS NOT NULL AND public.is_org_member(s.org_id)))
  WITH CHECK (true);

CREATE TRIGGER trg_sessions_updated BEFORE UPDATE ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX idx_sessions_user ON public.sessions(user_id);
CREATE INDEX idx_sessions_site ON public.sessions(site_id);
CREATE INDEX idx_sessions_plate ON public.sessions(plate);

-- =========================================================
-- notices
-- =========================================================
CREATE TABLE public.notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE RESTRICT,
  plate TEXT NOT NULL,
  reason TEXT NOT NULL,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  issued_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notices TO authenticated;
GRANT ALL ON public.notices TO service_role;

ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/enforcement see notices" ON public.notices FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'enforcement'));
CREATE POLICY "Operator sees notices for own sites" ON public.notices FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.sites s WHERE s.id = site_id AND s.org_id IS NOT NULL AND public.is_org_member(s.org_id)));
CREATE POLICY "Driver sees notices for own plate" ON public.notices FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.plate = plate));
CREATE POLICY "Enforcement/admin issue notices" ON public.notices FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'enforcement')
    OR EXISTS (SELECT 1 FROM public.sites s WHERE s.id = site_id AND s.org_id IS NOT NULL AND public.is_org_member(s.org_id)));

CREATE INDEX idx_notices_site ON public.notices(site_id);
CREATE INDEX idx_notices_plate ON public.notices(plate);

-- =========================================================
-- Seed sites (demo data for dashboards)
-- =========================================================
INSERT INTO public.sites (name, address, lat, lng, capacity, occupied, price_cents_per_hour, type, amenities, operator_name) VALUES
  ('City Center Parking',       'Marktplatz 1, Berlin',        52.520, 13.405, 240, 187, 350, 'garage', ARRAY['EV','24/7','Covered'], 'APCOA'),
  ('Hauptbahnhof P+R',          'Europaplatz 1, Berlin',       52.525, 13.369, 480, 302, 200, 'garage', ARRAY['EV','24/7'],           'Contipark'),
  ('Alexanderplatz Straße',     'Alexanderplatz, Berlin',      52.521, 13.413,  32,  30, 400, 'street', ARRAY['On-street'],           'Stadt Berlin'),
  ('Kulturforum Lot',           'Matthäikirchplatz, Berlin',   52.508, 13.367, 120,  45, 250, 'lot',    ARRAY['Disabled'],            'Q-Park'),
  ('Prenzlauer Berg Garage',    'Schönhauser Allee 80',        52.539, 13.412, 180,  96, 280, 'garage', ARRAY['EV','Covered'],        'APCOA'),
  ('Kreuzberg Kotti',           'Kottbusser Tor',              52.499, 13.418,  45,  41, 300, 'street', ARRAY['On-street'],           'Stadt Berlin');
