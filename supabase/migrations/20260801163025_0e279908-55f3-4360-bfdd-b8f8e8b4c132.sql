-- ---------------------------------------------------------------------------
-- Driver profile: vehicles, preferences, favourites
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.business_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  billing_email text,
  vat_id text,
  monthly_limit_cents integer NOT NULL DEFAULT 0 CHECK (monthly_limit_cents >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_accounts TO authenticated;
GRANT ALL ON public.business_accounts TO service_role;
ALTER TABLE public.business_accounts ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.business_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.business_accounts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner','manager','member')),
  spend_limit_cents integer NOT NULL DEFAULT 0 CHECK (spend_limit_cents >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_members TO authenticated;
GRANT ALL ON public.business_members TO service_role;
ALTER TABLE public.business_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_business_member(_account_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.business_members bm
    WHERE bm.account_id = _account_id AND bm.user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.business_accounts ba
    WHERE ba.id = _account_id AND ba.owner_user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_business_manager(_account_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.business_members bm
    WHERE bm.account_id = _account_id AND bm.user_id = auth.uid()
      AND bm.role IN ('owner','manager')
  ) OR EXISTS (
    SELECT 1 FROM public.business_accounts ba
    WHERE ba.id = _account_id AND ba.owner_user_id = auth.uid()
  );
$$;

CREATE POLICY "Members read own business account" ON public.business_accounts
  FOR SELECT TO authenticated USING (public.is_business_member(id));
CREATE POLICY "Users create own business account" ON public.business_accounts
  FOR INSERT TO authenticated WITH CHECK (owner_user_id = auth.uid());
CREATE POLICY "Managers update business account" ON public.business_accounts
  FOR UPDATE TO authenticated USING (public.is_business_manager(id))
  WITH CHECK (public.is_business_manager(id));
CREATE POLICY "Owners delete business account" ON public.business_accounts
  FOR DELETE TO authenticated USING (owner_user_id = auth.uid());

CREATE POLICY "Members read business members" ON public.business_members
  FOR SELECT TO authenticated USING (public.is_business_member(account_id));
CREATE POLICY "Managers manage business members" ON public.business_members
  FOR INSERT TO authenticated WITH CHECK (public.is_business_manager(account_id));
CREATE POLICY "Managers update business members" ON public.business_members
  FOR UPDATE TO authenticated USING (public.is_business_manager(account_id))
  WITH CHECK (public.is_business_manager(account_id));
CREATE POLICY "Managers remove business members" ON public.business_members
  FOR DELETE TO authenticated USING (public.is_business_manager(account_id));

CREATE TABLE IF NOT EXISTS public.cost_centres (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.business_accounts(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  budget_cents integer NOT NULL DEFAULT 0 CHECK (budget_cents >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cost_centres TO authenticated;
GRANT ALL ON public.cost_centres TO service_role;
ALTER TABLE public.cost_centres ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read cost centres" ON public.cost_centres
  FOR SELECT TO authenticated USING (public.is_business_member(account_id));
CREATE POLICY "Managers insert cost centres" ON public.cost_centres
  FOR INSERT TO authenticated WITH CHECK (public.is_business_manager(account_id));
CREATE POLICY "Managers update cost centres" ON public.cost_centres
  FOR UPDATE TO authenticated USING (public.is_business_manager(account_id))
  WITH CHECK (public.is_business_manager(account_id));
CREATE POLICY "Managers delete cost centres" ON public.cost_centres
  FOR DELETE TO authenticated USING (public.is_business_manager(account_id));

CREATE TABLE IF NOT EXISTS public.vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plate text NOT NULL,
  country text NOT NULL DEFAULT 'DE',
  label text,
  is_default boolean NOT NULL DEFAULT false,
  is_electric boolean NOT NULL DEFAULT false,
  accessibility_permit boolean NOT NULL DEFAULT false,
  business_account_id uuid REFERENCES public.business_accounts(id) ON DELETE SET NULL,
  cost_centre_id uuid REFERENCES public.cost_centres(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, plate)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicles TO authenticated;
GRANT ALL ON public.vehicles TO service_role;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Drivers read own vehicles" ON public.vehicles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR (business_account_id IS NOT NULL AND public.is_business_manager(business_account_id)));
CREATE POLICY "Drivers insert own vehicles" ON public.vehicles
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Drivers update own vehicles" ON public.vehicles
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Drivers delete own vehicles" ON public.vehicles
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.driver_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  language text NOT NULL DEFAULT 'en' CHECK (language IN ('en','de')),
  large_type boolean NOT NULL DEFAULT false,
  high_contrast boolean NOT NULL DEFAULT false,
  reduced_motion boolean NOT NULL DEFAULT false,
  step_free_only boolean NOT NULL DEFAULT false,
  expiry_reminder_minutes integer NOT NULL DEFAULT 15
    CHECK (expiry_reminder_minutes BETWEEN 0 AND 120),
  notify_email boolean NOT NULL DEFAULT true,
  notify_push boolean NOT NULL DEFAULT true,
  default_duration_minutes integer NOT NULL DEFAULT 60
    CHECK (default_duration_minutes BETWEEN 5 AND 1440),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.driver_preferences TO authenticated;
GRANT ALL ON public.driver_preferences TO service_role;
ALTER TABLE public.driver_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Drivers manage own preferences" ON public.driver_preferences
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.favourite_sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, site_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.favourite_sites TO authenticated;
GRANT ALL ON public.favourite_sites TO service_role;
ALTER TABLE public.favourite_sites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Drivers manage own favourites" ON public.favourite_sites
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Site data quality reports
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.site_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  reporter_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  category text NOT NULL CHECK (category IN ('price','availability','location','access','closed','other')),
  details text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewing','resolved','rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.site_reports TO authenticated;
GRANT ALL ON public.site_reports TO service_role;
ALTER TABLE public.site_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reporters read own reports" ON public.site_reports
  FOR SELECT TO authenticated USING (reporter_id = auth.uid());
CREATE POLICY "Operators and admins read site reports" ON public.site_reports
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR EXISTS (
      SELECT 1 FROM public.sites s
      WHERE s.id = site_reports.site_id AND s.org_id IS NOT NULL
        AND public.is_operator_org_member(s.org_id)
    )
  );
CREATE POLICY "Drivers create reports" ON public.site_reports
  FOR INSERT TO authenticated WITH CHECK (reporter_id = auth.uid());
CREATE POLICY "Operators and admins update reports" ON public.site_reports
  FOR UPDATE TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR EXISTS (
      SELECT 1 FROM public.sites s
      WHERE s.id = site_reports.site_id AND s.org_id IS NOT NULL
        AND public.is_operator_org_member(s.org_id)
    )
  ) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- Transparent tariffs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tariff_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Standard',
  currency text NOT NULL DEFAULT 'EUR',
  free_minutes integer NOT NULL DEFAULT 0 CHECK (free_minutes >= 0),
  minimum_charge_cents integer NOT NULL DEFAULT 0 CHECK (minimum_charge_cents >= 0),
  service_fee_cents integer NOT NULL DEFAULT 0 CHECK (service_fee_cents >= 0),
  reservation_fee_cents integer NOT NULL DEFAULT 0 CHECK (reservation_fee_cents >= 0),
  daily_cap_cents integer CHECK (daily_cap_cents IS NULL OR daily_cap_cents >= 0),
  max_stay_minutes integer CHECK (max_stay_minutes IS NULL OR max_stay_minutes > 0),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.tariff_plans TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tariff_plans TO authenticated;
GRANT ALL ON public.tariff_plans TO service_role;
ALTER TABLE public.tariff_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads active tariff plans" ON public.tariff_plans
  FOR SELECT TO anon, authenticated USING (active);
CREATE POLICY "Operators manage own tariff plans" ON public.tariff_plans
  FOR ALL TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR EXISTS (
      SELECT 1 FROM public.sites s
      WHERE s.id = tariff_plans.site_id AND s.org_id IS NOT NULL
        AND public.is_operator_org_member(s.org_id)
    )
  ) WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR EXISTS (
      SELECT 1 FROM public.sites s
      WHERE s.id = tariff_plans.site_id AND s.org_id IS NOT NULL
        AND public.is_operator_org_member(s.org_id)
    )
  );
CREATE UNIQUE INDEX IF NOT EXISTS tariff_plans_active_site_idx
  ON public.tariff_plans(site_id) WHERE active;

-- ---------------------------------------------------------------------------
-- Access passes (QR / ANPR / barrier)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.access_passes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  session_id uuid REFERENCES public.sessions(id) ON DELETE CASCADE,
  reservation_id uuid REFERENCES public.reservations(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('qr','anpr','barrier')),
  code text NOT NULL,
  plate text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','used','expired','revoked')),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.access_passes TO authenticated;
GRANT ALL ON public.access_passes TO service_role;
ALTER TABLE public.access_passes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Drivers read own access passes" ON public.access_passes
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE INDEX IF NOT EXISTS access_passes_user_idx
  ON public.access_passes(user_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Support cases
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.support_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject text NOT NULL,
  category text NOT NULL DEFAULT 'other'
    CHECK (category IN ('payment','session','notice','account','site','other')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','pending','resolved','closed')),
  reference_type text,
  reference_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.support_cases TO authenticated;
GRANT ALL ON public.support_cases TO service_role;
ALTER TABLE public.support_cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own support cases" ON public.support_cases
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users create own support cases" ON public.support_cases
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins update support cases" ON public.support_cases
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.support_cases(id) ON DELETE CASCADE,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.support_messages TO authenticated;
GRANT ALL ON public.support_messages TO service_role;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants read support messages" ON public.support_messages
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR EXISTS (
      SELECT 1 FROM public.support_cases c
      WHERE c.id = support_messages.case_id AND c.user_id = auth.uid()
    )
  );
CREATE POLICY "Participants write support messages" ON public.support_messages
  FOR INSERT TO authenticated WITH CHECK (
    author_id = auth.uid() AND (
      public.has_role(auth.uid(), 'admin') OR EXISTS (
        SELECT 1 FROM public.support_cases c
        WHERE c.id = support_messages.case_id AND c.user_id = auth.uid()
      )
    )
  );

-- ---------------------------------------------------------------------------
-- Enforcement offline drafts
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notice_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  officer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  site_id uuid REFERENCES public.sites(id) ON DELETE SET NULL,
  plate text,
  reason text,
  amount_cents integer CHECK (amount_cents IS NULL OR (amount_cents >= 0 AND amount_cents <= 100000)),
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  captured_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','discarded')),
  notice_id uuid REFERENCES public.notices(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notice_drafts TO authenticated;
GRANT ALL ON public.notice_drafts TO service_role;
ALTER TABLE public.notice_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Officers manage own drafts" ON public.notice_drafts
  FOR ALL TO authenticated USING (officer_id = auth.uid()) WITH CHECK (officer_id = auth.uid());

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'business_accounts','business_members','cost_centres','vehicles',
    'driver_preferences','site_reports','tariff_plans','access_passes',
    'support_cases','notice_drafts'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_updated ON public.%I', t, t);
    EXECUTE format(
      'CREATE TRIGGER trg_%s_updated BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at()',
      t, t
    );
  END LOOP;
END $$;

-- Seed a default tariff plan per existing site so pricing is transparent today.
INSERT INTO public.tariff_plans (site_id, name, minimum_charge_cents, service_fee_cents, reservation_fee_cents, daily_cap_cents, max_stay_minutes)
SELECT s.id, 'Standard', GREATEST(50, s.price_cents_per_hour / 4), 29, 49,
       s.price_cents_per_hour * 8, 1440
FROM public.sites s
WHERE NOT EXISTS (SELECT 1 FROM public.tariff_plans tp WHERE tp.site_id = s.id);