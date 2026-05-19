-- ============================================================
-- MIGRACIÓN _064: Validación de identificaciones tributarias
-- Cédula (módulo 10), RUC natural/sociedad/pública (módulo 11)
-- CHECK constraint en tabla clientes
-- ============================================================

-- ── Función: validar cédula ecuatoriana (módulo 10) ──────────
CREATE OR REPLACE FUNCTION validar_cedula_ecuador(p_cedula TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql IMMUTABLE STRICT
AS $$
DECLARE
  coef    INTEGER[] := ARRAY[2,1,2,1,2,1,2,1,2];
  suma    INTEGER   := 0;
  prod    INTEGER;
  prov    INTEGER;
  tercero INTEGER;
  i       INTEGER;
BEGIN
  IF p_cedula !~ '^\d{10}$' THEN RETURN FALSE; END IF;

  prov := CAST(LEFT(p_cedula, 2) AS INTEGER);
  IF prov < 1 OR prov > 24 THEN RETURN FALSE; END IF;

  tercero := CAST(SUBSTRING(p_cedula, 3, 1) AS INTEGER);
  IF tercero > 5 THEN RETURN FALSE; END IF;

  FOR i IN 1..9 LOOP
    prod := CAST(SUBSTRING(p_cedula, i, 1) AS INTEGER) * coef[i];
    IF prod >= 10 THEN prod := prod - 9; END IF;
    suma := suma + prod;
  END LOOP;

  RETURN CAST(SUBSTRING(p_cedula, 10, 1) AS INTEGER)
       = CASE WHEN suma % 10 = 0 THEN 0 ELSE 10 - (suma % 10) END;
END;
$$;

-- ── Función: validar RUC ecuatoriano ─────────────────────────
CREATE OR REPLACE FUNCTION validar_ruc_ecuador(p_ruc TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql IMMUTABLE STRICT
AS $$
DECLARE
  prov    INTEGER;
  tercero INTEGER;
  coef9   INTEGER[] := ARRAY[4,3,2,7,6,5,4,3,2];
  coef8   INTEGER[] := ARRAY[3,2,7,6,5,4,3,2];
  suma    INTEGER   := 0;
  residuo INTEGER;
  verif   INTEGER;
  i       INTEGER;
BEGIN
  IF p_ruc !~ '^\d{13}$' THEN RETURN FALSE; END IF;

  prov := CAST(LEFT(p_ruc, 2) AS INTEGER);
  IF prov < 1 OR prov > 24 THEN RETURN FALSE; END IF;

  tercero := CAST(SUBSTRING(p_ruc, 3, 1) AS INTEGER);

  -- Persona natural (dígito 3: 0-5): primeros 10 = cédula válida
  IF tercero <= 5 THEN
    RETURN validar_cedula_ecuador(LEFT(p_ruc, 10))
       AND CAST(SUBSTRING(p_ruc, 11, 3) AS INTEGER) >= 1;
  END IF;

  -- Persona jurídica privada (dígito 3: 9) — módulo 11, 9 coeficientes
  IF tercero = 9 THEN
    FOR i IN 1..9 LOOP
      suma := suma + CAST(SUBSTRING(p_ruc, i, 1) AS INTEGER) * coef9[i];
    END LOOP;
    residuo := suma % 11;
    verif   := CASE WHEN residuo = 0 THEN 0 ELSE 11 - residuo END;
    RETURN CAST(SUBSTRING(p_ruc, 10, 1) AS INTEGER) = verif
       AND CAST(SUBSTRING(p_ruc, 11, 3) AS INTEGER) >= 1;
  END IF;

  -- Entidad pública (dígito 3: 6) — módulo 11, 8 coeficientes
  IF tercero = 6 THEN
    FOR i IN 1..8 LOOP
      suma := suma + CAST(SUBSTRING(p_ruc, i, 1) AS INTEGER) * coef8[i];
    END LOOP;
    residuo := suma % 11;
    verif   := CASE WHEN residuo = 0 THEN 0 ELSE 11 - residuo END;
    RETURN CAST(SUBSTRING(p_ruc, 9, 1) AS INTEGER) = verif
       AND CAST(SUBSTRING(p_ruc, 10, 4) AS INTEGER) >= 1;
  END IF;

  RETURN FALSE;
END;
$$;

-- ── Función principal de validación (usada en CHECK) ─────────
CREATE OR REPLACE FUNCTION validar_identificacion_cliente(
  p_tipo TEXT,
  p_identificacion TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql IMMUTABLE STRICT
AS $$
BEGIN
  CASE p_tipo
    WHEN 'consumidor_final' THEN
      RETURN p_identificacion = '9999999999999';
    WHEN 'cedula' THEN
      RETURN validar_cedula_ecuador(p_identificacion);
    WHEN 'ruc' THEN
      RETURN validar_ruc_ecuador(p_identificacion);
    WHEN 'pasaporte' THEN
      RETURN p_identificacion ~ '^[A-Z0-9]{5,20}$';
    ELSE
      RETURN FALSE;
  END CASE;
END;
$$;

-- Permisos de las funciones (solo autenticados)
REVOKE ALL ON FUNCTION validar_cedula_ecuador(TEXT)                  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION validar_ruc_ecuador(TEXT)                     FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION validar_identificacion_cliente(TEXT, TEXT)    FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION validar_cedula_ecuador(TEXT)              TO authenticated;
GRANT  EXECUTE ON FUNCTION validar_ruc_ecuador(TEXT)                 TO authenticated;
GRANT  EXECUTE ON FUNCTION validar_identificacion_cliente(TEXT, TEXT) TO authenticated;

-- ── CHECK constraint en tabla clientes ───────────────────────
ALTER TABLE clientes
  DROP CONSTRAINT IF EXISTS clientes_identificacion_valida;

ALTER TABLE clientes
  ADD CONSTRAINT clientes_identificacion_valida
  CHECK (validar_identificacion_cliente(tipo_identificacion::TEXT, identificacion));
