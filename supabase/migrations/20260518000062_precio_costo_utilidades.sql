-- Fase 1: precio de costo por producto (solo admin, no visible en tienda)
ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS precio_costo DECIMAL(10,2) DEFAULT NULL;

-- ── Función: utilidades agregadas por producto en rango de fechas ─────────────
CREATE OR REPLACE FUNCTION calcular_utilidades(p_desde DATE, p_hasta DATE)
RETURNS TABLE (
  producto_id    UUID,
  nombre         TEXT,
  precio_costo   DECIMAL,
  total_unidades BIGINT,
  total_ingresos DECIMAL,
  total_costo    DECIMAL,
  utilidad_total DECIMAL,
  precio_min     DECIMAL,
  precio_max     DECIMAL
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.nombre::TEXT,
    p.precio_costo,
    SUM((item->>'cantidad')::INT)::BIGINT                                                       AS total_unidades,
    SUM((item->>'subtotal')::DECIMAL)                                                           AS total_ingresos,
    SUM((item->>'cantidad')::INT * p.precio_costo)                                              AS total_costo,
    SUM((item->>'subtotal')::DECIMAL) - SUM((item->>'cantidad')::INT * p.precio_costo)          AS utilidad_total,
    MIN((item->>'precio')::DECIMAL)                                                             AS precio_min,
    MAX((item->>'precio')::DECIMAL)                                                             AS precio_max
  FROM pedidos ped
  CROSS JOIN LATERAL jsonb_array_elements(ped.items) AS item
  JOIN productos p ON p.id = (item->>'producto_id')::UUID
  WHERE ped.estado IN ('procesando', 'completado')
    AND ped.creado_en::DATE BETWEEN p_desde AND p_hasta
    AND p.precio_costo IS NOT NULL
    AND p.precio_costo > 0
  GROUP BY p.id, p.nombre, p.precio_costo
  ORDER BY (SUM((item->>'subtotal')::DECIMAL) - SUM((item->>'cantidad')::INT * p.precio_costo)) DESC;
END;
$$;

REVOKE ALL ON FUNCTION calcular_utilidades(DATE, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION calcular_utilidades(DATE, DATE) TO authenticated;

-- ── Función: ventas individuales de un producto en rango de fechas ─────────────
CREATE OR REPLACE FUNCTION ventas_producto(p_producto_id UUID, p_desde DATE, p_hasta DATE)
RETURNS TABLE (
  pedido_id      UUID,
  numero_orden   TEXT,
  cliente        TEXT,
  fecha          DATE,
  precio_vendido DECIMAL,
  cantidad       INT,
  costo_unitario DECIMAL,
  utilidad       DECIMAL
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_costo DECIMAL;
BEGIN
  SELECT precio_costo INTO v_costo FROM productos WHERE id = p_producto_id;
  IF v_costo IS NULL THEN RETURN; END IF;

  RETURN QUERY
  SELECT
    ped.id,
    ped.numero_orden::TEXT,
    ped.nombres::TEXT,
    ped.creado_en::DATE,
    (item->>'precio')::DECIMAL,
    (item->>'cantidad')::INT,
    v_costo,
    ((item->>'precio')::DECIMAL - v_costo) * (item->>'cantidad')::INT
  FROM pedidos ped
  CROSS JOIN LATERAL jsonb_array_elements(ped.items) AS item
  WHERE (item->>'producto_id')::UUID = p_producto_id
    AND ped.estado IN ('procesando', 'completado')
    AND ped.creado_en::DATE BETWEEN p_desde AND p_hasta
  ORDER BY ped.creado_en DESC;
END;
$$;

REVOKE ALL ON FUNCTION ventas_producto(UUID, DATE, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION ventas_producto(UUID, DATE, DATE) TO authenticated;
