-- ============================================================
--  RESET DE DATOS DE CLIENTE
--  Elimina transacciones y deja el sistema como nuevo.
--  Productos, categorías, configuración y usuarios se conservan.
--
--  ⚠️  EJECUTAR EN SQL EDITOR DE SUPABASE DEL PROYECTO CLIENTE
--  ⚠️  ESTA OPERACIÓN ES IRREVERSIBLE — HACER BACKUP ANTES
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. FACTURAS Y NOTAS DE CRÉDITO
-- ------------------------------------------------------------
DELETE FROM facturas;

-- ------------------------------------------------------------
-- 2. PROFORMAS
-- ------------------------------------------------------------
DELETE FROM proformas;

-- ------------------------------------------------------------
-- 4. ALQUILERES
-- ------------------------------------------------------------
DELETE FROM alquileres;

-- ------------------------------------------------------------
-- 5. CITAS
-- ------------------------------------------------------------
DELETE FROM citas;

-- ------------------------------------------------------------
-- 6. PEDIDOS
-- ------------------------------------------------------------
DELETE FROM pedidos;

-- ------------------------------------------------------------
-- 7. CLIENTES
-- ------------------------------------------------------------
DELETE FROM clientes;

-- ------------------------------------------------------------
-- 8. SOLICITUDES DE EVENTO
-- ------------------------------------------------------------
DELETE FROM solicitudes_evento;

-- ------------------------------------------------------------
-- 9. LEADS (teléfonos capturados por modales)
-- ------------------------------------------------------------
DELETE FROM leads;

-- ------------------------------------------------------------
-- 10. LIKES DE PRODUCTOS (anónimos)
-- ------------------------------------------------------------
DELETE FROM likes_producto;

-- ------------------------------------------------------------
-- 11. RESEÑAS DE PRODUCTOS
-- ------------------------------------------------------------
DELETE FROM resenas_producto;

-- ------------------------------------------------------------
-- 12. MENSAJES DEL SUPERADMIN AL ADMIN
-- ------------------------------------------------------------
DELETE FROM mensajes_admin;

-- ------------------------------------------------------------
-- 14. REINICIAR SECUENCIAS DE NUMERACIÓN
-- ------------------------------------------------------------

-- Pedidos: ORD-00001 al siguiente
ALTER SEQUENCE pedidos_numero_seq RESTART WITH 1;

-- Solicitudes de evento: SOL-00001 al siguiente
ALTER SEQUENCE solicitudes_numero_seq RESTART WITH 1;

-- Proformas: PRO-001 al siguiente
ALTER SEQUENCE proformas_numero_seq RESTART WITH 1;

-- ------------------------------------------------------------
-- 15. REINICIAR CONTADORES DE FACTURACIÓN SRI
--     secuencial_actual  → próxima factura será 000000001
--     secuencial_nc_actual → próxima nota de crédito será 000000001
-- ------------------------------------------------------------
UPDATE configuracion_facturacion
SET
  secuencial_actual    = 1,
  secuencial_nc_actual = 1;

COMMIT;

-- ------------------------------------------------------------
-- VERIFICACIÓN (ejecutar después del COMMIT para confirmar)
-- ------------------------------------------------------------
SELECT 'pedidos'           AS tabla, COUNT(*) AS registros FROM pedidos
UNION ALL
SELECT 'clientes',                   COUNT(*) FROM clientes
UNION ALL
SELECT 'citas',                      COUNT(*) FROM citas
UNION ALL
SELECT 'alquileres',                 COUNT(*) FROM alquileres
UNION ALL
SELECT 'solicitudes_evento',         COUNT(*) FROM solicitudes_evento
UNION ALL
SELECT 'facturas',                   COUNT(*) FROM facturas
UNION ALL
SELECT 'proformas',                  COUNT(*) FROM proformas
UNION ALL
SELECT 'cuentas_por_cobrar',         COUNT(*) FROM cuentas_por_cobrar
UNION ALL
SELECT 'leads',                      COUNT(*) FROM leads
UNION ALL
SELECT 'likes_producto',             COUNT(*) FROM likes_producto
UNION ALL
SELECT 'resenas_producto',           COUNT(*) FROM resenas_producto
UNION ALL
SELECT 'mensajes_admin',             COUNT(*) FROM mensajes_admin
ORDER BY tabla;
