-- ── Sub-fase 3.1: Cuentas por Cobrar ─────────────────────────────────────────

-- Config de crédito en configuracion_tienda
ALTER TABLE configuracion_tienda
  ADD COLUMN IF NOT EXISTS credito_activo          BOOLEAN        DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS credito_interes_activo  BOOLEAN        DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS credito_tasa_mensual    DECIMAL(5,2)   DEFAULT 0,
  ADD COLUMN IF NOT EXISTS credito_cuotas_max      INTEGER        DEFAULT 6;

-- Campos de crédito en pedidos
ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS es_credito               BOOLEAN        DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS credito_cuotas           INTEGER,
  ADD COLUMN IF NOT EXISTS credito_frecuencia       TEXT,          -- 'mensual' | 'quincenal' | 'semanal'
  ADD COLUMN IF NOT EXISTS credito_tasa             DECIMAL(5,2),  -- tasa al momento de la venta
  ADD COLUMN IF NOT EXISTS credito_total            DECIMAL(10,2), -- total con interés
  ADD COLUMN IF NOT EXISTS credito_monto_cuota      DECIMAL(10,2), -- valor de cada cuota
  ADD COLUMN IF NOT EXISTS credito_saldo_pendiente  DECIMAL(10,2); -- se reduce con abonos

-- ── Tabla: cuotas programadas ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cuotas_credito (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id         UUID          NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  numero_cuota      INTEGER       NOT NULL,
  monto             DECIMAL(10,2) NOT NULL,
  fecha_vencimiento DATE          NOT NULL,
  fecha_pago        DATE,                    -- NULL = pendiente
  estado            TEXT          NOT NULL DEFAULT 'pendiente', -- pendiente | pagado | vencido
  creado_en         TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cuotas_pedido  ON cuotas_credito(pedido_id);
CREATE INDEX IF NOT EXISTS idx_cuotas_estado  ON cuotas_credito(estado);
CREATE INDEX IF NOT EXISTS idx_cuotas_vence   ON cuotas_credito(fecha_vencimiento);

ALTER TABLE cuotas_credito ENABLE ROW LEVEL SECURITY;

-- Admin: acceso total
CREATE POLICY "cuotas_auth_all" ON cuotas_credito
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Público: solo lectura (para página /pedido/[numero])
CREATE POLICY "cuotas_anon_select" ON cuotas_credito
  FOR SELECT TO anon USING (true);

-- ── Tabla: abonos registrados ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS abonos_credito (
  id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id    UUID          NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  cuota_id     UUID          REFERENCES cuotas_credito(id) ON DELETE SET NULL,
  monto        DECIMAL(10,2) NOT NULL,
  fecha_pago   DATE          NOT NULL,
  metodo_pago  TEXT,         -- efectivo | transferencia | otro
  notas        TEXT,
  creado_en    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_abonos_pedido ON abonos_credito(pedido_id);

ALTER TABLE abonos_credito ENABLE ROW LEVEL SECURITY;

-- Solo admin puede ver y registrar abonos
CREATE POLICY "abonos_auth_all" ON abonos_credito
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── Función: marcar cuotas vencidas automáticamente ─────────────────────────
CREATE OR REPLACE FUNCTION marcar_cuotas_vencidas()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE cuotas_credito
  SET estado = 'vencido'
  WHERE estado = 'pendiente'
    AND fecha_vencimiento < CURRENT_DATE;
END;
$$;

GRANT EXECUTE ON FUNCTION marcar_cuotas_vencidas() TO authenticated;
