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
-- TABLAS (orden respeta las FK — hijos antes que padres)
-- ------------------------------------------------------------

-- Facturación
SELECT _borrar_si_existe('facturas');
SELECT _borrar_si_existe('proformas');

-- Ventas y reservas
SELECT _borrar_si_existe('alquileres');
SELECT _borrar_si_existe('citas');

-- Crédito (CASCADE desde pedidos, pero explicitamos por si acaso)
SELECT _borrar_si_existe('abonos_credito');
SELECT _borrar_si_existe('cuotas_credito');

-- Pedidos y clientes
SELECT _borrar_si_existe('pedidos');
SELECT _borrar_si_existe('clientes');

-- Solicitudes y leads
SELECT _borrar_si_existe('solicitudes_evento');
SELECT _borrar_si_existe('leads');

-- Reseñas y likes
SELECT _borrar_si_existe('likes_producto');
SELECT _borrar_si_existe('resenas_producto');

-- Finanzas
SELECT _borrar_si_existe('pagos_proveedores');
SELECT _borrar_si_existe('egresos');
SELECT _borrar_si_existe('cierres_caja');

-- Proveedores (después de pagos)
SELECT _borrar_si_existe('proveedores');

-- Mensajes internos
SELECT _borrar_si_existe('mensajes_admin');

-- Email marketing
SELECT _borrar_si_existe('contactos_campana');
SELECT _borrar_si_existe('campanas_email');
SELECT _borrar_si_existe('email_envios_diarios');

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
-- VERIFICACIÓN — todas deben quedar en 0
-- ------------------------------------------------------------
SELECT tabla, registros FROM (
  SELECT  1 AS ord, 'pedidos'             AS tabla, COUNT(*)::int AS registros FROM pedidos
  UNION ALL SELECT  2, 'clientes',                   COUNT(*) FROM clientes
  UNION ALL SELECT  3, 'citas',                      COUNT(*) FROM citas
  UNION ALL SELECT  4, 'alquileres',                 COUNT(*) FROM alquileres
  UNION ALL SELECT  5, 'solicitudes_evento',         COUNT(*) FROM solicitudes_evento
  UNION ALL SELECT  6, 'facturas',                   COUNT(*) FROM facturas
  UNION ALL SELECT  7, 'proformas',                  COUNT(*) FROM proformas
  UNION ALL SELECT  8, 'cuotas_credito',             COUNT(*) FROM cuotas_credito
  UNION ALL SELECT  9, 'abonos_credito',             COUNT(*) FROM abonos_credito
  UNION ALL SELECT 10, 'egresos',                    COUNT(*) FROM egresos
  UNION ALL SELECT 11, 'cierres_caja',               COUNT(*) FROM cierres_caja
  UNION ALL SELECT 12, 'pagos_proveedores',          COUNT(*) FROM pagos_proveedores
  UNION ALL SELECT 13, 'proveedores',                COUNT(*) FROM proveedores
  UNION ALL SELECT 14, 'leads',                      COUNT(*) FROM leads
  UNION ALL SELECT 15, 'likes_producto',             COUNT(*) FROM likes_producto
  UNION ALL SELECT 16, 'resenas_producto',           COUNT(*) FROM resenas_producto
  UNION ALL SELECT 17, 'mensajes_admin',             COUNT(*) FROM mensajes_admin
  UNION ALL SELECT 18, 'campanas_email',             COUNT(*) FROM campanas_email
  UNION ALL SELECT 19, 'contactos_campana',          COUNT(*) FROM contactos_campana
  UNION ALL SELECT 20, 'email_envios_diarios',       COUNT(*) FROM email_envios_diarios
) t ORDER BY ord;
