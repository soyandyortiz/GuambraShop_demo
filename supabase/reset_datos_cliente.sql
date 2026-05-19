-- ============================================================
--  RESET DE DATOS DE CLIENTE
--  Elimina transacciones y deja el sistema como nuevo.
--  Productos, categorías, configuración y usuarios se conservan.
--
--  ⚠️  EJECUTAR EN SQL EDITOR DE SUPABASE DEL PROYECTO CLIENTE
--  ⚠️  ESTA OPERACIÓN ES IRREVERSIBLE — HACER BACKUP ANTES
-- ============================================================

BEGIN;

-- Función auxiliar para borrar solo si la tabla existe
CREATE OR REPLACE FUNCTION _borrar_si_existe(p_tabla TEXT) RETURNS VOID AS $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = p_tabla) THEN
    EXECUTE format('DELETE FROM %I', p_tabla);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------
-- TABLAS (orden respeta las FK)
-- ------------------------------------------------------------
SELECT _borrar_si_existe('facturas');
SELECT _borrar_si_existe('proformas');
SELECT _borrar_si_existe('alquileres');
SELECT _borrar_si_existe('citas');
SELECT _borrar_si_existe('pedidos');
SELECT _borrar_si_existe('clientes');
SELECT _borrar_si_existe('solicitudes_evento');
SELECT _borrar_si_existe('likes_producto');
SELECT _borrar_si_existe('resenas_producto');
SELECT _borrar_si_existe('mensajes_admin');

-- ------------------------------------------------------------
-- REINICIAR SECUENCIAS DE NUMERACIÓN
-- ------------------------------------------------------------
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'pedidos_numero_seq') THEN
    ALTER SEQUENCE pedidos_numero_seq RESTART WITH 1;
  END IF;
  IF EXISTS (SELECT FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'solicitudes_numero_seq') THEN
    ALTER SEQUENCE solicitudes_numero_seq RESTART WITH 1;
  END IF;
  IF EXISTS (SELECT FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'proformas_numero_seq') THEN
    ALTER SEQUENCE proformas_numero_seq RESTART WITH 1;
  END IF;
END $$;

-- ------------------------------------------------------------
-- REINICIAR CONTADORES DE FACTURACIÓN SRI
-- ------------------------------------------------------------
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'configuracion_facturacion') THEN
    UPDATE configuracion_facturacion
    SET secuencial_actual = 1, secuencial_nc_actual = 1;
  END IF;
END $$;

-- Limpiar función auxiliar
DROP FUNCTION _borrar_si_existe(TEXT);

COMMIT;

-- ------------------------------------------------------------
-- VERIFICACIÓN
-- ------------------------------------------------------------
SELECT tabla, registros FROM (
  SELECT 1 AS ord, 'pedidos'           AS tabla, COUNT(*)::int AS registros FROM pedidos
  UNION ALL SELECT 2, 'clientes',          COUNT(*) FROM clientes
  UNION ALL SELECT 3, 'citas',             COUNT(*) FROM citas
  UNION ALL SELECT 4, 'alquileres',        COUNT(*) FROM alquileres
  UNION ALL SELECT 5, 'solicitudes_evento',COUNT(*) FROM solicitudes_evento
  UNION ALL SELECT 6, 'facturas',          COUNT(*) FROM facturas
  UNION ALL SELECT 7, 'likes_producto',    COUNT(*) FROM likes_producto
  UNION ALL SELECT 8, 'resenas_producto',  COUNT(*) FROM resenas_producto
  UNION ALL SELECT 9, 'mensajes_admin',    COUNT(*) FROM mensajes_admin
) t ORDER BY ord;
