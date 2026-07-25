ALTER TABLE public.orgs ADD COLUMN IF NOT EXISTS platform_fee_bps integer NOT NULL DEFAULT 500;
ALTER TABLE public.orgs ADD COLUMN IF NOT EXISTS platform_fixed_fee_cents integer NOT NULL DEFAULT 0;

ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS platform_fee_bps integer NOT NULL DEFAULT 500;
ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS platform_fixed_fee_cents integer NOT NULL DEFAULT 0;

ALTER TABLE public.sites ADD COLUMN IF NOT EXISTS platform_fee_bps integer;
ALTER TABLE public.sites ADD COLUMN IF NOT EXISTS platform_fixed_fee_cents integer;

ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS platform_fee_cents integer NOT NULL DEFAULT 0;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS operator_net_cents integer NOT NULL DEFAULT 0;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS payout_status text NOT NULL DEFAULT 'pending';

CREATE TABLE IF NOT EXISTS public.payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES public.orgs(id) ON DELETE SET NULL,
  provider_id uuid REFERENCES public.providers(id) ON DELETE SET NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  total_gross_cents integer NOT NULL DEFAULT 0,
  total_platform_fee_cents integer NOT NULL DEFAULT 0,
  total_net_cents integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'open',
  paid_at timestamptz,
  payout_ref text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.payouts TO authenticated;
GRANT ALL ON public.payouts TO service_role;

ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage payouts" ON public.payouts FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Operators read own payouts" ON public.payouts FOR SELECT TO authenticated USING (org_id IS NOT NULL AND public.is_org_member(org_id));

CREATE OR REPLACE FUNCTION public.calculate_platform_fee(_amount_cents integer, _org_id uuid, _provider_id uuid, _site_id uuid)
RETURNS TABLE(platform_fee_cents integer, operator_net_cents integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH resolved AS (
    SELECT
      COALESCE(
        (SELECT s.platform_fee_bps FROM public.sites s WHERE s.id = _site_id),
        (SELECT p.platform_fee_bps FROM public.providers p WHERE p.id = _provider_id),
        (SELECT o.platform_fee_bps FROM public.orgs o WHERE o.id = COALESCE(_org_id, (SELECT s2.org_id FROM public.sites s2 WHERE s2.id = _site_id))),
        500
      ) AS bps,
      COALESCE(
        (SELECT s.platform_fixed_fee_cents FROM public.sites s WHERE s.id = _site_id),
        (SELECT p.platform_fixed_fee_cents FROM public.providers p WHERE p.id = _provider_id),
        (SELECT o.platform_fixed_fee_cents FROM public.orgs o WHERE o.id = COALESCE(_org_id, (SELECT s2.org_id FROM public.sites s2 WHERE s2.id = _site_id))),
        0
      ) AS fixed
  )
  SELECT
    LEAST(GREATEST((_amount_cents * bps / 10000) + fixed, 0), _amount_cents)::integer AS platform_fee_cents,
    GREATEST(_amount_cents - LEAST(GREATEST((_amount_cents * bps / 10000) + fixed, 0), _amount_cents), 0)::integer AS operator_net_cents
  FROM resolved
$$;

CREATE OR REPLACE FUNCTION public.tg_payments_split_fee()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_org_id uuid;
  v_provider_id uuid;
  v_split record;
BEGIN
  SELECT org_id INTO v_org_id FROM public.sites WHERE id = NEW.site_id;
  SELECT provider_id INTO v_provider_id FROM public.site_provider_mapping WHERE site_id = NEW.site_id LIMIT 1;
  SELECT * INTO v_split FROM public.calculate_platform_fee(NEW.amount_cents, v_org_id, v_provider_id, NEW.site_id);
  NEW.platform_fee_cents := v_split.platform_fee_cents;
  NEW.operator_net_cents := v_split.operator_net_cents;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_payments_split_fee ON public.payments;
CREATE TRIGGER trg_payments_split_fee
BEFORE INSERT ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.tg_payments_split_fee();

-- Back-fill existing paid payments using the default split logic.
UPDATE public.payments p
SET platform_fee_cents = f.platform_fee_cents,
    operator_net_cents = f.operator_net_cents
FROM (
  SELECT p2.id,
         (public.calculate_platform_fee(p2.amount_cents, s.org_id, m.provider_id, p2.site_id)).platform_fee_cents AS platform_fee_cents,
         (public.calculate_platform_fee(p2.amount_cents, s.org_id, m.provider_id, p2.site_id)).operator_net_cents AS operator_net_cents
  FROM public.payments p2
  LEFT JOIN public.sites s ON s.id = p2.site_id
  LEFT JOIN public.site_provider_mapping m ON m.site_id = p2.site_id
) f
WHERE p.id = f.id;

DROP TRIGGER IF EXISTS tg_set_updated_at_payouts ON public.payouts;
CREATE TRIGGER tg_set_updated_at_payouts BEFORE UPDATE ON public.payouts
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();