ALTER TABLE public.sites
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS inventory_source text,
  ADD COLUMN IF NOT EXISTS inventory_verified_at timestamptz;

UPDATE public.providers
SET status = 'onboarding',
    notes = concat_ws(' ', notes, 'Production activation requires the application provider allowlist and verified feed configuration.')
WHERE slug IN ('datex-berlin', 'opendata-hamburg', 'apcoa');

DROP POLICY IF EXISTS "Sites are public" ON public.sites;
DROP POLICY IF EXISTS "Published sites are public" ON public.sites;
CREATE POLICY "Published sites are public" ON public.sites
  FOR SELECT USING (is_public);

DROP POLICY IF EXISTS "Admins and operators read managed sites" ON public.sites;
CREATE POLICY "Admins and operators read managed sites" ON public.sites
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR
    (org_id IS NOT NULL AND public.is_org_member(org_id))
  );

CREATE INDEX IF NOT EXISTS sites_public_location_idx
  ON public.sites(is_public, lat, lng) WHERE is_public;

CREATE OR REPLACE FUNCTION public.require_published_parking_site()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.sites WHERE id = NEW.site_id AND is_public) THEN
    RAISE EXCEPTION 'Parking site is not available for customer transactions';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sessions_require_published_site ON public.sessions;
CREATE TRIGGER trg_sessions_require_published_site
  BEFORE INSERT ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION public.require_published_parking_site();

DROP TRIGGER IF EXISTS trg_reservations_require_published_site ON public.reservations;
CREATE TRIGGER trg_reservations_require_published_site
  BEFORE INSERT ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.require_published_parking_site();

REVOKE ALL ON FUNCTION public.require_published_parking_site() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.set_site_publication(_site_id uuid, _is_public boolean)
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
  IF auth.uid() IS NULL OR NOT (
    public.has_role(auth.uid(), 'admin') OR
    (v_site.org_id IS NOT NULL AND public.is_org_member(v_site.org_id))
  ) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF _is_public AND (
    v_site.capacity < 1 OR
    v_site.occupied > v_site.capacity OR
    v_site.price_cents_per_hour < 0 OR
    length(trim(v_site.name)) < 2 OR
    length(trim(v_site.address)) < 4
  ) THEN RAISE EXCEPTION 'Site inventory is incomplete'; END IF;

  UPDATE public.sites SET
    is_public = _is_public,
    inventory_source = coalesce(inventory_source, 'operator-manual'),
    inventory_verified_at = CASE WHEN _is_public THEN now() ELSE inventory_verified_at END,
    updated_at = now()
  WHERE id = _site_id
  RETURNING * INTO v_site;

  INSERT INTO public.audit_events(actor_user_id, org_id, action, entity_type, entity_id, metadata)
  VALUES (
    auth.uid(), v_site.org_id, 'site.publication_changed', 'site', v_site.id::text,
    jsonb_build_object('is_public', _is_public, 'inventory_source', v_site.inventory_source)
  );
  RETURN v_site;
END;
$$;

REVOKE ALL ON FUNCTION public.set_site_publication(uuid,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_site_publication(uuid,boolean) TO authenticated;

DROP POLICY IF EXISTS "Officers upload own evidence" ON storage.objects;
CREATE POLICY "Officers upload own evidence" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'enforcement-evidence' AND
    (storage.foldername(name))[1] = auth.uid()::text AND
    (public.has_role(auth.uid(), 'enforcement') OR public.has_role(auth.uid(), 'admin'))
  );

DROP POLICY IF EXISTS "Officers read enforcement evidence" ON storage.objects;
CREATE POLICY "Officers read enforcement evidence" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'enforcement-evidence' AND
    (public.has_role(auth.uid(), 'enforcement') OR public.has_role(auth.uid(), 'admin'))
  );

CREATE OR REPLACE FUNCTION public.is_enforcement_evidence_linked(_path text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.notices n
    WHERE coalesce(n.evidence->'photo_paths', '[]'::jsonb) ? _path
  );
$$;

REVOKE ALL ON FUNCTION public.is_enforcement_evidence_linked(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_enforcement_evidence_linked(text) TO authenticated;

DROP POLICY IF EXISTS "Officers remove own unlinked evidence" ON storage.objects;
CREATE POLICY "Officers remove own unlinked evidence" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'enforcement-evidence' AND
    (storage.foldername(name))[1] = auth.uid()::text AND
    (public.has_role(auth.uid(), 'enforcement') OR public.has_role(auth.uid(), 'admin')) AND
    NOT public.is_enforcement_evidence_linked(name)
  );

CREATE OR REPLACE FUNCTION public.validate_notice_evidence()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_path text;
BEGIN
  IF NEW.evidence ? 'photo_urls' THEN
    RAISE EXCEPTION 'External evidence URLs are not accepted';
  END IF;
  IF NEW.evidence ? 'photo_paths' THEN
    IF jsonb_typeof(NEW.evidence->'photo_paths') <> 'array' OR
       jsonb_array_length(NEW.evidence->'photo_paths') > 8 THEN
      RAISE EXCEPTION 'Invalid evidence photo paths';
    END IF;
    IF jsonb_array_length(NEW.evidence->'photo_paths') > 0 AND NEW.issued_by IS NULL THEN
      RAISE EXCEPTION 'Evidence requires an issuing officer';
    END IF;
    FOR v_path IN SELECT jsonb_array_elements_text(NEW.evidence->'photo_paths') LOOP
      IF v_path !~ ('^' || NEW.issued_by::text || '/[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$') THEN
        RAISE EXCEPTION 'Evidence path is not owned by the issuing officer';
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notices_validate_evidence ON public.notices;
CREATE TRIGGER trg_notices_validate_evidence
  BEFORE INSERT OR UPDATE OF evidence ON public.notices
  FOR EACH ROW EXECUTE FUNCTION public.validate_notice_evidence();

REVOKE ALL ON FUNCTION public.validate_notice_evidence() FROM PUBLIC, anon, authenticated;