
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

UPDATE public.providers SET status = 'active' WHERE slug IN ('datex-berlin','opendata-hamburg','apcoa');

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'parkpunkt-sync-providers') THEN
    PERFORM cron.unschedule('parkpunkt-sync-providers');
  END IF;
END $$;

SELECT cron.schedule(
  'parkpunkt-sync-providers',
  '17 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--b728c831-f225-449d-9765-7edf1e997c5d.lovable.app/api/public/cron/sync-providers',
    headers := '{"Content-Type":"application/json","apikey":"sb_publishable_xnF5DfZkiDr83XIg8E71WQ_gUHUAvHO"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
