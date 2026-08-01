REVOKE ALL ON FUNCTION public.calculate_platform_fee(integer, uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tg_payments_split_fee() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.calculate_platform_fee(integer, uuid, uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.tg_payments_split_fee() TO service_role;