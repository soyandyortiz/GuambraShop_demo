-- Función que retorna el tamaño actual de la base de datos en bytes
-- Solo accesible con service_role (usa SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.obtener_tamano_db()
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pg_database_size(current_database())::bigint;
$$;

REVOKE ALL ON FUNCTION public.obtener_tamano_db() FROM public, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.obtener_tamano_db() TO service_role;
