-- Payphone: configuración en tienda, campo en pedidos y constraint forma_pago

-- 1. Columnas en configuracion_tienda
ALTER TABLE configuracion_tienda
  ADD COLUMN IF NOT EXISTS payphone_activo BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS payphone_token TEXT,
  ADD COLUMN IF NOT EXISTS payphone_store_id TEXT;

-- 2. Columna en pedidos para trazabilidad
ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS payphone_payment_id TEXT;

-- 3. Ampliar constraint forma_pago para incluir payphone y paypal
ALTER TABLE pedidos DROP CONSTRAINT IF EXISTS pedidos_forma_pago_check;
ALTER TABLE pedidos ADD CONSTRAINT pedidos_forma_pago_check
  CHECK (forma_pago IN ('efectivo', 'transferencia', 'tarjeta', 'otro', 'payphone', 'paypal'));
