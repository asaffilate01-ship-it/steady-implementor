
CREATE OR REPLACE FUNCTION public.tg_sessions_occupancy()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'active' THEN
    UPDATE public.sites SET occupied = LEAST(capacity, occupied + 1) WHERE id = NEW.site_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'active' AND NEW.status <> 'active' THEN
    UPDATE public.sites SET occupied = GREATEST(0, occupied - 1) WHERE id = NEW.site_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sessions_occupancy
AFTER INSERT OR UPDATE OF status ON public.sessions
FOR EACH ROW EXECUTE FUNCTION public.tg_sessions_occupancy();
