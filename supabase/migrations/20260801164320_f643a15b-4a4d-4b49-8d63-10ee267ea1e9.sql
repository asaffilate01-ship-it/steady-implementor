REVOKE ALL ON public.provider_credentials FROM anon, authenticated;
GRANT ALL ON public.provider_credentials TO service_role;

DROP POLICY IF EXISTS "Operators and admins update reports" ON public.site_reports;
CREATE POLICY "Operators and admins update reports"
ON public.site_reports FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM public.sites s
    WHERE s.id = site_reports.site_id AND s.org_id IS NOT NULL AND public.is_operator_org_member(s.org_id)
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM public.sites s
    WHERE s.id = site_reports.site_id AND s.org_id IS NOT NULL AND public.is_operator_org_member(s.org_id)
  )
);