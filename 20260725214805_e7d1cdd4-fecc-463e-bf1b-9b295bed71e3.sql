
-- Enums
DO $$ BEGIN
  CREATE TYPE public.provider_kind AS ENUM ('operator','municipal','datex','handyparken','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.provider_auth AS ENUM ('none','api_key','oauth2','basic');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.provider_status AS ENUM ('active','paused','onboarding');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- providers
CREATE TABLE public.providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  kind public.provider_kind NOT NULL DEFAULT 'operator',
  country text NOT NULL DEFAULT 'DE',
  contact_email text,
  api_base_url text,
  auth_type public.provider_auth NOT NULL DEFAULT 'none',
  status public.provider_status NOT NULL DEFAULT 'onboarding',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.providers TO authenticated;
GRANT ALL ON public.providers TO service_role;
ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "providers_admin_provider_read" ON public.providers FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'provider'));
CREATE POLICY "providers_admin_write" ON public.providers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER providers_set_updated_at BEFORE UPDATE ON public.providers
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- provider_credentials
CREATE TABLE public.provider_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  credential_ref text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.provider_credentials TO authenticated;
GRANT ALL ON public.provider_credentials TO service_role;
ALTER TABLE public.provider_credentials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "provider_creds_admin" ON public.provider_credentials FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- site_provider_mapping
CREATE TABLE public.site_provider_mapping (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  external_site_id text NOT NULL,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(provider_id, external_site_id),
  UNIQUE(site_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_provider_mapping TO authenticated;
GRANT ALL ON public.site_provider_mapping TO service_role;
ALTER TABLE public.site_provider_mapping ENABLE ROW LEVEL SECURITY;
CREATE POLICY "site_map_read" ON public.site_provider_mapping FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'provider'));
CREATE POLICY "site_map_write" ON public.site_provider_mapping FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- api_keys
CREATE TABLE public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES public.providers(id) ON DELETE SET NULL,
  owner_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  key_hash text NOT NULL UNIQUE,
  key_prefix text NOT NULL,
  scopes text[] NOT NULL DEFAULT ARRAY['orchestrate:quote']::text[],
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.api_keys TO authenticated;
GRANT ALL ON public.api_keys TO service_role;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
-- Admins see all; providers see their own (owner) keys; hash never exposed via view
CREATE POLICY "api_keys_admin_all" ON public.api_keys FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "api_keys_owner_read" ON public.api_keys FOR SELECT TO authenticated
  USING (owner_user_id = auth.uid() AND public.has_role(auth.uid(),'provider'));
CREATE POLICY "api_keys_owner_insert" ON public.api_keys FOR INSERT TO authenticated
  WITH CHECK (owner_user_id = auth.uid() AND public.has_role(auth.uid(),'provider'));
CREATE POLICY "api_keys_owner_update" ON public.api_keys FOR UPDATE TO authenticated
  USING (owner_user_id = auth.uid() AND public.has_role(auth.uid(),'provider'))
  WITH CHECK (owner_user_id = auth.uid() AND public.has_role(auth.uid(),'provider'));

-- api_request_log
CREATE TABLE public.api_request_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id uuid REFERENCES public.api_keys(id) ON DELETE SET NULL,
  path text NOT NULL,
  status int NOT NULL,
  latency_ms int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX api_request_log_key_time_idx ON public.api_request_log(api_key_id, created_at DESC);
GRANT SELECT, INSERT ON public.api_request_log TO authenticated;
GRANT ALL ON public.api_request_log TO service_role;
ALTER TABLE public.api_request_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "api_log_admin_read" ON public.api_request_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "api_log_owner_read" ON public.api_request_log FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.api_keys k WHERE k.id = api_key_id AND k.owner_user_id = auth.uid()));

-- Seed a couple of default providers so the admin/provider UIs aren't empty
INSERT INTO public.providers (name, slug, kind, country, api_base_url, auth_type, status, notes) VALUES
  ('Berlin DATEX II','datex-berlin','datex','DE','https://data.mobilithek.info/','none','onboarding','Public DATEX II parking feed for Berlin. No credentials required.'),
  ('Hamburg Open Data','opendata-hamburg','municipal','DE','https://api.hamburg.de/datasets/v1/','none','onboarding','Public parking dataset from the Hamburg Transparenzportal.'),
  ('APCOA Connect','apcoa','operator','DE','https://api.apcoa-connect.com/','api_key','onboarding','Commercial operator — requires signed contract + API key.')
ON CONFLICT (slug) DO NOTHING;
