
DROP POLICY IF EXISTS "Admin/operator updates any session" ON public.sessions;
CREATE POLICY "Admin/operator updates any session" ON public.sessions FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR EXISTS (SELECT 1 FROM public.sites s WHERE s.id = site_id AND s.org_id IS NOT NULL AND public.is_org_member(s.org_id)))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR EXISTS (SELECT 1 FROM public.sites s WHERE s.id = site_id AND s.org_id IS NOT NULL AND public.is_org_member(s.org_id)));
