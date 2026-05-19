# GuambraShop — Deploy para nuevo cliente

## 1. Crear proyecto en Supabase

1. Ir a [supabase.com](https://supabase.com) → **New project**
2. En la pantalla de configuración:
   - Elegir región **América**
   - Marcar solo **Habilitar la API de datos** ✅
   - Dejar **Habilitar RLS automático** sin marcar ☐

## 2. Base de datos

En **SQL Editor** de Supabase ejecutar en este orden exacto:

### Paso 1 — Schema completo (tablas, funciones, RLS)

Abrir el archivo `supabase/schema.sql` → copiar todo el contenido → pegarlo en SQL Editor → **Run**.

> Este archivo es el schema unificado y cubre **todas** las tablas, funciones, políticas RLS, triggers y módulos del sistema hasta la migración `_064`. No requiere ejecutar migraciones adicionales.

### Paso 2 — Datos iniciales

Ejecutar `supabase/seed/01_datos_iniciales.sql` — crea la fila base en `configuracion_tienda` con valores genéricos para que la tienda arranque sin errores.

> **Nota para futuras migraciones:** si se crean nuevas migraciones en `supabase/migrations/` con número mayor al `_064`, deben ejecutarse manualmente después del schema **y** luego incorporarse al `schema.sql` para mantenerlo actualizado. El schema completo ya incluye hasta `_064` (validación de identificaciones tributarias).

## 3. Usuarios administradores

### Crear el usuario

1. En el menú lateral izquierdo de Supabase, click en **Authentication**
2. En el submenú, click en **Users**
3. En la parte superior derecha, click en **Add user** → **Create new user**
4. Completar el formulario:
   - **Email**: correo del administrador
   - **Password**: contraseña segura
   - Activar el toggle **Auto Confirm User** ✅ (evita email de verificación)
5. Click en **Create User**

### Asignar el rol vía SQL

La interfaz de Supabase ya no permite editar los metadatos visualmente. Hay que hacerlo desde **SQL Editor**.

En el menú lateral, click en **SQL Editor** y ejecutar:

**Superadmin (siempre GuambraWeb):**
```sql
UPDATE auth.users
SET raw_user_meta_data = '{"rol": "superadmin", "nombre": "GuambraWeb"}'
WHERE email = 'andyortiz.ec@gmail.com';
```

**Admin (cuenta del cliente):**
```sql
UPDATE auth.users
SET raw_user_meta_data = '{"rol": "admin", "nombre": "Nombre del cliente"}'
WHERE email = 'correo@delcliente.com';
```

> Reemplazar el email y nombre del admin con los datos reales del cliente.

### Verificar y corregir roles

1. En el menú lateral, click en **Table Editor**
2. Seleccionar la tabla **perfiles**
3. Debe aparecer una fila por cada usuario con el `rol` correcto

> **Problema frecuente:** el trigger crea la fila en `perfiles` en el momento que se crea el usuario, antes de que se ejecute el SQL que asigna los metadatos. Por eso el rol queda como `admin` aunque sea superadmin.

Si el rol en `perfiles` está incorrecto, corregirlo directamente desde **SQL Editor**:

```sql
UPDATE perfiles
SET rol = 'superadmin'
WHERE id = (SELECT id FROM auth.users WHERE email = 'andyortiz.ec@gmail.com');
```

> Si `perfiles` está vacía, el trigger no se ejecutó — probablemente el usuario fue creado antes de correr el `schema.sql`. Solución: eliminar el usuario desde Authentication → Users y volver a crearlo después de haber ejecutado el schema.

### Problema: "Usuario o contraseña incorrectos" al ingresar al admin

Si el login falla con ese mensaje (error 400 en consola), las causas en orden de probabilidad son:

1. **Variables de entorno en Vercel apuntan al proyecto Supabase equivocado** — el usuario existe en otro proyecto. Verificar que `NEXT_PUBLIC_SUPABASE_URL` sea exactamente la URL del proyecto donde se creó el usuario (Supabase → Settings → API → Project URL).

2. **Usuario no creado en ese proyecto** — ir a Authentication → Users y verificar que aparece el email. Si no está, crearlo siguiendo los pasos anteriores.

3. **Contraseña incorrecta** — resetearla desde Authentication → Users → `···` → **Send password recovery** o cambiarla directamente.

> **Importante:** después de cambiar variables de entorno en Vercel siempre hacer **Redeploy** para que tomen efecto.

### URL Configuration en Supabase (para dominios y subdominios)

En Supabase → **Authentication → URL Configuration** agregar el dominio del cliente:
- **Site URL:** `https://tutienda.vercel.app`
- **Redirect URLs:** `https://tutienda.vercel.app/**` y `https://tudominio.com/**` (si tiene dominio propio)

Esto es necesario para que los links de reset de contraseña funcionen. El login con email/password no depende del dominio.

## 4. Datos iniciales del cliente (opcional)

El `01_datos_iniciales.sql` ya crea una fila base en `configuracion_tienda` con datos genéricos, por lo que la tienda funciona sin este paso.

Hay dos opciones:

**Opción A — vía SQL (antes del deploy):** editar `supabase/produccion/seed_nuevo_cliente.sql` con los datos reales del cliente y ejecutarlo en **SQL Editor**.

**Opción B — vía panel admin (después del deploy):** ingresar a `/admin/dashboard/perfil` y completar los datos desde el formulario visual. Es la opción más cómoda.

## 5. Deploy en Vercel

1. Ir a [vercel.com](https://vercel.com) → **Add New Project** → importar el repositorio de GitHub
2. En **Environment Variables** agregar:

**Requeridas:**
```
NEXT_PUBLIC_SUPABASE_URL       → Project URL  (Supabase → Settings → API)
NEXT_PUBLIC_SUPABASE_ANON_KEY  → anon/public key  (Supabase → Settings → API)
NEXT_PUBLIC_SITE_URL           → URL del proyecto en Vercel (completar después del primer deploy)
NEXT_PUBLIC_SOPORTE_WHATSAPP   → número WhatsApp de soporte (solo dígitos, ej: 593982650929)
SUPABASE_SERVICE_ROLE_KEY      → service_role key (Supabase → Settings → API) — requerida para facturación SRI, email y clientes
```

**Opcionales — notificaciones Telegram:**
```
TELEGRAM_BOT_TOKEN             → token del bot
TELEGRAM_CHAT_ID               → id del grupo/canal destino
```

3. Click en **Deploy**

## 6. Post-deploy

- Copiar la URL asignada por Vercel y actualizar `NEXT_PUBLIC_SITE_URL` → hacer redeploy
- Ingresar al admin (`/admin`) y completar: logo, favicon, tema, colores, redes sociales, zonas de envío, etc.
- Si el cliente tiene dominio propio, configurarlo en **Vercel → Domains**

---

## Módulos del sistema

### Facturación SRI

Solo para clientes que necesiten emitir facturas electrónicas al SRI Ecuador.

1. Ir a `/admin/dashboard/facturacion/configuracion` (solo superadmin)
2. Completar: RUC, razón social, dirección, establecimiento, punto de emisión
3. Seleccionar tipo de contribuyente: **RUC General**, **RIMPE Emprendedor** o **Artesano JNDA**
4. Subir el certificado `.p12` y ingresar el PIN
5. Seleccionar ambiente: **Pruebas** para probar, **Producción** cuando el contador apruebe
6. Guardar — el sistema queda listo para emitir facturas desde Pedidos o desde Facturación

> **Nota:** el certificado `.p12` lo emite el Banco Central del Ecuador o un proveedor autorizado. El cliente debe solicitarlo con su RUC en el portal del SRI.

#### Funciones disponibles en la tabla de facturas

| Botón | Cuándo aparece | Qué hace |
|-------|----------------|----------|
| **Consultar SRI** | Factura en estado *Pendiente SRI* | Re-consulta la autorización al SRI usando la clave de acceso guardada |
| **NC** | Factura autorizada sin Nota de Crédito activa | Abre modal para emitir una Nota de Crédito Electrónica (código 04) |
| **Email** | Factura autorizada con email del comprador | Envía el RIDE PDF al comprador |
| **RIDE** | Factura o NC autorizada | Descarga el PDF en formato estándar SRI con logo y código de barras |
| **XML** | Cualquier factura con XML firmado | Descarga el XML firmado |
| **Imprimir** | Siempre | Imprime ticket térmico de la factura |

#### Notas de Crédito Electrónicas

Las Notas de Crédito (NC) son el mecanismo oficial del SRI para anular una factura ya autorizada. El sistema las emite con código de comprobante `04` y las envía directamente al SRI.

**Plazo para emitirlas:** hasta el día de vencimiento de la declaración de IVA del mes siguiente, según el último dígito del RUC (día 10 al 28). El sistema muestra un indicador visual (verde / ámbar / rojo) con los días restantes al abrir el modal de NC.

#### RIDE PDF

El RIDE sigue el formato estándar SRI Ecuador:
- **Logo** tomado desde `/admin/dashboard/perfil` → pestaña Imágenes → campo *Logotipo del Menú*. Usar imagen con fondo blanco o transparente.
- **Código de barras** Code 128 generado automáticamente a partir de la clave de acceso de 49 dígitos.

---

### Módulo Email

Permite enviar emails al cliente: confirmación de pedido automática y RIDE PDF de facturas.

1. Ir a `/admin/dashboard/email` (solo superadmin)
2. Elegir proveedor:
   - **Gmail** — cuenta Gmail + contraseña de aplicación de 16 caracteres (myaccount.google.com/apppasswords)
   - **SMTP propio** — servidor, puerto, usuario y contraseña del hosting
   - **Resend** — API key de resend.com (requiere dominio verificado, 3 000 emails/mes gratis)
3. Completar nombre y email del remitente
4. Activar **Envío activo** ✅
5. Activar **Envío automático** si se quiere que el RIDE llegue solo al autorizarse la factura
6. Usar **Probar envío** para confirmar que las credenciales son correctas antes de guardar

#### Límites por proveedor (emails/día)

| Proveedor | Límite diario | Límite mensual |
|-----------|--------------|----------------|
| Gmail | 499 | — |
| SMTP propio | 199 | — |
| Resend | 99 | 2 999 |

#### Emails automáticos que envía el sistema

| Evento | Destinatario | Condición |
|--------|-------------|-----------|
| Pedido creado en tienda online | Cliente | Email activo en `configuracion_email` |
| Factura autorizada por SRI | Comprador (email en datos de facturación) | Email activo + envío automático activado |
| RIDE enviado manualmente | Comprador | Botón Email en tabla de facturas |

---

### Módulo Clientes

Base de datos de clientes con campos listos para facturación SRI.

- **Importación automática**: el botón **Importar desde pedidos** en `/admin/dashboard/clientes` recorre todos los pedidos sin `cliente_id`, agrupa por email, crea un registro por cliente y los vincula. Los datos reales (cédula/RUC) siempre tienen prioridad sobre Consumidor Final.
- **Vinculación con POS**: al seleccionar un cliente en el Punto de Venta, el pedido queda vinculado automáticamente y sus datos de facturación se pre-llenan.
- **Total facturado**: solo suma pedidos en estado `procesando` o `completado` — excluye pendientes, en espera y cancelados.

---

### Punto de Venta (POS)

Accesible desde `/admin/dashboard/venta-nueva`. Permite crear ventas en persona sin que el cliente pase por la tienda online.

- Búsqueda de productos en tiempo real (≥ 2 caracteres)
- Seleccionar cliente de la base de datos o marcar **Consumidor Final** directamente
- Descuento manual en monto fijo
- Formas de pago: efectivo, transferencia, tarjeta, otro
- Al confirmar la venta:
  - Crea el pedido con `es_venta_manual = true`
  - Descuenta stock de productos físicos
  - Registra filas en `alquileres` para productos de tipo alquiler
  - Registra filas en `citas` para servicios (fecha = hoy, hora = hora actual, estado = confirmada)
  - Permite imprimir ticket térmico inmediatamente
  - Permite emitir factura electrónica SRI al instante

---

### Impresión Térmica

Configurable desde `/admin/dashboard/impresion` (solo superadmin).

- **Tamaño de papel**: 58 mm o 80 mm
- **Cabecera editable**: 4 líneas de texto libre (nombre, RUC, dirección, teléfono, etc.)
- **Pie de página**: 2 líneas de texto libre (ej: "Gracias por su compra", horarios)
- **Precio unitario**: activar/desactivar la columna de precio por unidad en el ticket
- **Previsualizar**: abre un ticket de muestra antes de guardar

El botón de impresión aparece en:
- POS → tras completar una venta
- Pedidos → en cada pedido entregado o venta manual
- Facturación → en cada fila de factura

---

### Notificaciones Telegram (opcional)

El sistema envía notificaciones automáticas al grupo o canal de Telegram del cliente cuando ocurren eventos: nuevo pedido, nueva cita, nueva solicitud de evento, stock bajo y resumen diario.

#### Paso 1 — Crear el bot con BotFather

1. Abrir Telegram y buscar **@BotFather**
2. Escribir `/newbot` y seguir las instrucciones
3. BotFather entregará un token, ej: `7412365890:AAFxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
4. Copiar ese token — es el valor de `TELEGRAM_BOT_TOKEN`

#### Paso 2 — Crear el grupo y obtener el Chat ID

1. Crear un grupo nuevo en Telegram y agregar el bot como miembro
2. Escribir cualquier mensaje en el grupo
3. Abrir en el navegador:
   ```
   https://api.telegram.org/bot{TOKEN}/getUpdates
   ```
4. En la respuesta JSON buscar `"chat": { "id": -1002345678901 }` — ese número negativo es `TELEGRAM_CHAT_ID`

> Si el JSON aparece vacío, escribir otro mensaje en el grupo e intentar de nuevo.

#### Paso 3 — Agregar las variables en Vercel

```
TELEGRAM_BOT_TOKEN   → token de BotFather
TELEGRAM_CHAT_ID     → id del grupo (número negativo, con el - incluido)
```

Hacer **redeploy** después de agregar las variables. Crear un pedido de prueba para verificar que llega la notificación.

---

### Módulo Finanzas

Control financiero completo del negocio. Accesible desde la sección **Finanzas** del panel admin.

#### Ingresos

`/admin/dashboard/ingresos` — resumen de ingresos por período con desglose por forma de pago (efectivo, transferencia, tarjeta). Filtra por rango de fechas y muestra todos los pedidos en estado `procesando` o `completado`.

#### Cierre de Caja

`/admin/dashboard/cierres-caja` — cierre diario de caja.

- Calcula automáticamente los totales del día sumando pedidos en estado `procesando` o `completado`
- Resta los egresos en efectivo del día para mostrar el efectivo real esperado en caja
- El admin ingresa el efectivo físico contado; el sistema detecta y muestra la diferencia (descuadre)
- Queda registrado históricamente — no se puede cerrar dos veces el mismo día
- **Estados:** Caja Abierta (sin cierre) / Caja Cerrada (ya registrado)

#### Egresos

`/admin/dashboard/egresos` — registro de gastos y pagos.

- Categorías: **Proveedores**, **Servicios**, **Nómina**, **Alquiler**, **Otros**
- Métodos de pago: efectivo, transferencia, tarjeta
- Los egresos en efectivo afectan directamente el cierre de caja del día
- Los abonos a proveedores generan un egreso automáticamente (no hay que registrarlo por separado)

#### Proveedores

`/admin/dashboard/proveedores` — control de deudas con proveedores.

- CRUD de proveedores con RUC, contacto, email y ciudad
- **Registrar Deuda**: incrementa el saldo pendiente del proveedor (compra realizada a crédito)
- **Abonar**: registra el pago parcial o total — crea automáticamente un egreso vinculado para que el cierre de caja sea exacto
- El saldo pendiente se actualiza en tiempo real; se muestra en rojo si hay deuda, verde si está saldado
- Historial de abonos recientes visible en el panel lateral

#### Comprobantes de Pago (Transferencia Bancaria)

Flujo completo para ventas online con validación manual del pago por el admin.

**Flujo del cliente (carrito — 4 pasos):**
1. Carrito → Entrega → Mis datos → **Pago**
2. En el paso 4, el cliente ve las cuentas bancarias y tiene **15 minutos** para subir el comprobante (JPG, PNG, WEBP o PDF, máx. 10 MB)
3. Si el tiempo expira sin subir el comprobante, el pedido temporal se cancela automáticamente
4. Al subir el comprobante se crea el pedido real con estado `pendiente_validacion`

**Estados de pedido (flujo WooCommerce):**
| Estado | Descripción |
|--------|-------------|
| `pendiente_pago` | Pedido registrado, sin pago |
| `pendiente_validacion` | Comprobante subido, esperando revisión admin |
| `procesando` | Pago confirmado, en preparación |
| `en_espera` | En espera de stock u otra condición |
| `completado` | Entregado/finalizado |
| `cancelado` | Cancelado por admin o cliente |
| `reembolsado` | Pago reembolsado |
| `fallido` | Pago fallido |

**Panel admin (`/admin/dashboard/pedidos`):**
- Badge en el sidebar cuenta `pendiente_pago` + `pendiente_validacion` juntos
- Tab "Por validar" filtra pedidos con comprobante pendiente (fila en amarillo)
- Al hacer clic en el ojo → página de detalle `/admin/dashboard/pedidos/[id]`
  - Muestra el comprobante inline (imagen) o enlace de descarga (PDF)
  - Banner amarillo con botones **Confirmar pago** y **Rechazar**
  - Advertencia naranja con cuenta regresiva si el comprobante está próximo a eliminarse
- **Confirmar pago**: llama RPC `confirmar_pedido()` (descuenta stock) + `marcar_comprobante_para_eliminar()` (timer 48h)
- **Rechazar**: cambia estado a `cancelado`

**Eliminación automática de comprobantes:**
- Al confirmar el pago, el comprobante se marca para eliminarse en 48 horas
- El cron job `/api/pedidos/limpiar-expirados` (cada 5 min) elimina el archivo de Storage y limpia las columnas
- Configurado en `vercel.json` — requiere plan Vercel Pro para el cron de 5 min

**Variables de entorno requeridas:**
```
SUPABASE_SERVICE_ROLE_KEY   # Para subir/eliminar comprobantes desde la API
CRON_SECRET                 # Vercel lo inyecta automáticamente en Pro
```

**Storage bucket:** `comprobantes` (privado, 10 MB máx.). Se crea automáticamente al ejecutar el schema.

#### Pago con PayPal

Módulo opcional que permite al comprador pagar en línea con PayPal sin salir del carrito. Se activa por tienda: cada cliente tiene sus propias credenciales PayPal y los cobros van directamente a su cuenta — GuambraWeb solo configura técnicamente pero no recibe dinero.

---

**¿Cómo funciona el modelo de cuentas?**

```
Comprador  ──paga──▶  PayPal del CLIENTE (negocio)
                           ▲
            Andy (GuambraWeb / superadmin) configuró las credenciales
```

- El **cliente** (dueño del negocio) abre su propia cuenta **PayPal Business** y crea una app en el portal de desarrolladores de PayPal.
- La app entrega un **Client ID** y un **Secret** — son las llaves que identifican la cuenta del cliente ante PayPal.
- **Andy (superadmin)** entra al panel del cliente y registra esas credenciales en la sección PayPal.
- Desde ese momento, cada pago va directo a la cuenta PayPal del cliente. GuambraWeb no tiene acceso a esos fondos.

---

**Pasos para activar PayPal en un cliente:**

1. El cliente crea cuenta en [paypal.com/business](https://www.paypal.com/business) (debe ser cuenta Business, no personal)
2. El cliente entra a [developer.paypal.com](https://developer.paypal.com) → **Apps & Credentials**
3. Crea una nueva App en modo **Live** (producción) — el nombre no importa, p.ej. "Mi Tienda"
4. La app muestra el **Client ID** y el **Secret** — el cliente los comparte con Andy
5. Andy entra al panel del cliente: **Perfil → pestaña Métodos de pago → sección PayPal**
6. Ingresa Client ID, Secret, cambia el modo a `Producción` y activa el toggle

> **Sandbox (pruebas):** Para probar sin dinero real, usa las credenciales Sandbox del mismo portal y deja el modo en `sandbox`. Las tarjetas de prueba de PayPal funcionan automáticamente.

---

**Flujo del comprador (carrito — paso 4):**

Cuando PayPal está activo, el paso "Pago" muestra dos pestañas:

| Pestaña | Qué hace |
|---------|----------|
| **Transferencia** | Flujo anterior: muestra cuentas bancarias + subida de comprobante |
| **PayPal** | Carga los botones oficiales de PayPal inline — el comprador paga sin salir de la tienda |

Al aprobar el pago en PayPal:
1. El servidor captura el pago vía API de PayPal
2. Se crea el pedido con `forma_pago = 'paypal'` y se llama automáticamente a `confirmar_pedido()` → descuenta stock, confirma citas
3. El pedido queda en estado `procesando` directamente (sin necesitar validación manual)
4. Se envía email de confirmación al comprador y notificación Telegram al admin

**El admin no necesita hacer nada** — los pedidos PayPal llegan ya confirmados.

---

**Diferencia clave entre los dos flujos:**

| | Transferencia | PayPal |
|---|---|---|
| Requiere acción del admin | Sí (revisar comprobante) | No (automático) |
| Estado inicial del pedido | `pendiente_validacion` | `procesando` |
| Stock descontado | Al confirmar manualmente | Automático al pagar |
| Confirmación al comprador | Tras validación admin | Inmediata |

---

**Tablas/columnas involucradas:**

```sql
-- configuracion_tienda
paypal_activo     BOOLEAN  DEFAULT false
paypal_client_id  TEXT
paypal_secret     TEXT
paypal_modo       TEXT     DEFAULT 'sandbox'  -- 'sandbox' | 'production'

-- pedidos
paypal_order_id   TEXT     -- capture ID de PayPal para trazabilidad
```

**Migración:** `supabase/migrations/20260511000052_paypal_config.sql`

**Variables de entorno:** ninguna adicional — las credenciales se guardan en la base de datos del cliente, no en el entorno de Vercel.

---

#### Pago con Payphone

Módulo opcional que permite al comprador pagar en línea con Payphone (tarjeta o app) sin salir del carrito. Funciona con la **Cajita de Pagos** (widget embebido). Los cobros van directamente a la cuenta Payphone del cliente.

---

**¿Cómo funciona el modelo de cuentas?**

```
Comprador  ──paga──▶  Cuenta Payphone del CLIENTE (negocio)
                           ▲
            Andy (GuambraWeb / superadmin) configuró el token
```

---

**Pasos completos para activar Payphone en un cliente nuevo:**

**1. El cliente crea su cuenta Payphone**
- Ir a [payphonetodoesposible.com](https://www.payphonetodoesposible.com) → registrarse como negocio
- Completar la verificación de identidad y cuenta bancaria

**2. Crear aplicación tipo "Web" en el portal de desarrolladores**
- Entrar a [appdeveloper.payphonetodoesposible.com](https://appdeveloper.payphonetodoesposible.com)
- Click en **Nueva Aplicación** y llenar:

| Campo | Valor |
|-------|-------|
| Nombre | Nombre del negocio (ej. "Chakana Ecommerce") |
| Descripción | Pasarela de pago para tienda online |
| Categoría | La que corresponda al negocio |
| Plataforma Desarrollo | .Net (o cualquiera) |
| **Tipo de Aplicación** | **Web** ← crítico, NO usar "Api" |
| Dominio web | `https://dominio-del-cliente.com` (con https://) |
| URL de respuesta | `https://dominio-del-cliente.com/api/pedidos/payphone/confirmar` |

> **Importante:** el Tipo de Aplicación debe ser **Web**. Con tipo "Api" el widget de la Cajita devuelve error 401.

**3. Copiar el Token**
- Una vez creada la app, ir a la pestaña **Credenciales**
- Copiar el **Token** (campo largo alfanumérico)

**4. Configurar en el panel admin**
- Entrar al panel del cliente: **Perfil → pestaña Métodos de pago → sección Payphone**
- Pegar el Token y activar el toggle

**5. Ejecutar la migración SQL** (si no se usó `schema.sql` completo)
- En **Supabase → SQL Editor** del proyecto del cliente, ejecutar:

```sql
-- Migración _059: columnas Payphone
ALTER TABLE configuracion_tienda
  ADD COLUMN IF NOT EXISTS payphone_activo BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS payphone_token TEXT,
  ADD COLUMN IF NOT EXISTS payphone_store_id TEXT;

ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS payphone_payment_id TEXT;

ALTER TABLE pedidos DROP CONSTRAINT IF EXISTS pedidos_forma_pago_check;
ALTER TABLE pedidos ADD CONSTRAINT pedidos_forma_pago_check
  CHECK (forma_pago IN ('efectivo', 'transferencia', 'tarjeta', 'otro', 'payphone', 'paypal'));
```

> La tabla `pedidos_temporales` ya la crea la migración `_051_comprobantes_pago.sql` — no hace falta crearla de nuevo.

---

**Flujo del comprador (carrito — paso 4):**

Cuando Payphone está activo, aparece el botón "Pagar con Payphone" junto a los demás métodos:

1. El comprador hace click → se guarda el carrito en `pedidos_temporales` (30 min de expiración)
2. Aparece la **Cajita de Payphone** (widget embebido) — el comprador paga con tarjeta o app
3. Payphone redirige a `/api/pedidos/payphone/confirmar`
4. El servidor crea el pedido en `pedidos` con `estado = 'procesando'` y `forma_pago = 'payphone'`
5. Se descuenta stock, se envía email de confirmación y notificación Telegram
6. El comprador llega a `/pedido/GS-2026-XXXXXX?pago=payphone`

**El admin no necesita hacer nada** — los pedidos Payphone llegan directamente en estado `procesando`.

---

**Pruebas (modo sandbox):**
- En el portal de Payphone, la app puede estar en modo **Prueba** o **Producción**
- En modo Prueba aparece la opción "Tester PayPhone" — simula pagos sin cobrar dinero real
- El flujo completo funciona igual en prueba y producción
- Para producción real: cambiar la app a modo Producción en el portal y actualizar el token en el panel admin

---

**Diferencia clave entre los métodos de pago:**

| | Transferencia | PayPal | Payphone |
|---|---|---|---|
| Requiere acción del admin | Sí (revisar comprobante) | No | No |
| Estado inicial del pedido | `pendiente_validacion` | `procesando` | `procesando` |
| Stock descontado | Al confirmar manualmente | Automático | Automático |
| Confirmación al comprador | Tras validación admin | Inmediata | Inmediata |

---

**Tablas/columnas involucradas:**

```sql
-- configuracion_tienda
payphone_activo   BOOLEAN  DEFAULT false
payphone_token    TEXT
payphone_store_id TEXT     -- opcional, para multi-tienda Payphone

-- pedidos
payphone_payment_id TEXT   -- ID de transacción Payphone para trazabilidad
```

**Migración:** `supabase/migrations/20260516000059_payphone.sql`

**Variables de entorno:** ninguna adicional — el token se guarda en la base de datos del cliente.

---

## Meta Pixel + Google Analytics 4

Permite medir tráfico, conversiones y ROAS de campañas publicitarias en Facebook/Instagram y Google.

### Configuración (por cliente)

1. Ir a **Panel admin → Perfil de tienda → tab Marketing**
2. Ingresar el **Pixel ID** de Meta (ej. `123456789012345`)
3. Ingresar el **ID de medición GA4** (ej. `G-XXXXXXXXXX`)
4. Guardar — los scripts se activan de inmediato en toda la tienda

### Dónde obtener cada ID

| Herramienta | Ruta |
|-------------|------|
| Meta Pixel | Meta Business Suite → Administrador de eventos → Tu píxel → Configuración |
| Google Analytics 4 | analytics.google.com → Admin → Flujos de datos → Tu sitio web → ID de medición |

### Eventos que se rastrean automáticamente

| Evento | Cuándo se dispara |
|--------|-------------------|
| `PageView` (Meta) | En cada carga de página |
| `page_view` (GA4) | En cada navegación |
| `Purchase` (Meta) | Al llegar a `/pedido/[numero]` tras completar una compra |
| `purchase` (GA4) | Al llegar a `/pedido/[numero]` — incluye monto, moneda e ítems |

### SQL para nuevo cliente

```sql
-- Migración _060: columnas de analytics en configuracion_tienda
ALTER TABLE configuracion_tienda
  ADD COLUMN IF NOT EXISTS meta_pixel_id        TEXT,
  ADD COLUMN IF NOT EXISTS google_analytics_id  TEXT;
```

**Migración:** `supabase/migrations/20260516000060_analytics.sql`

**Variables de entorno:** ninguna — los IDs se guardan en la base de datos del cliente.

> **Nota:** Si la migración no se ha aplicado, los colores y tema de la tienda se mantienen intactos. Los scripts de analytics simplemente no se inyectan hasta que se ejecute la migración y se configuren los IDs.

---

## Monitor de límites (Supabase)

El panel admin incluye monitoreo en tiempo real de los límites del plan gratuito de Supabase en `/admin/dashboard/almacenamiento`.

### Métricas monitoreadas

| Métrica | Límite plan gratuito | Fuente |
|---|---|---|
| Base de datos PostgreSQL | 500 MB | `pg_database_size()` — tiempo real |
| Archivos e imágenes (Storage) | 1 GB | Supabase Storage API |

### Niveles de alerta

- **Verde** — uso normal (< 70% archivos, < 75% BD)
- **Amarillo** — espacio limitado (≥ 70% archivos, ≥ 75% BD)
- **Rojo** — crítico (≥ 90%) — riesgo de bloqueo

Cuando hay alerta, aparece un banner en todas las páginas del dashboard con enlace a la sección de almacenamiento.

### Notificación Telegram

Desde `/admin/dashboard/almacenamiento` → botón **Verificar límites** envía una alerta al grupo de Telegram configurado si algún límite supera el umbral. Requiere `TELEGRAM_BOT_TOKEN` y `TELEGRAM_CHAT_ID`.

### SQL requerido por cliente

Las siguientes funciones deben existir en cada proyecto Supabase. Están incluidas en `schema_completo.sql` — si el cliente ya tiene el schema aplicado, ejecutar manualmente:

```sql
-- Tamaño de la base de datos
CREATE OR REPLACE FUNCTION public.obtener_tamano_db()
RETURNS bigint LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$ SELECT pg_database_size(current_database())::bigint; $$;

REVOKE ALL ON FUNCTION public.obtener_tamano_db() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.obtener_tamano_db() TO service_role;

-- Uso de storage por bucket
CREATE OR REPLACE FUNCTION public.obtener_uso_storage()
RETURNS TABLE (bucket_id text, total_bytes bigint, total_archivos bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = storage, public
AS $$
BEGIN
  RETURN QUERY
  SELECT o.bucket_id,
    COALESCE(SUM((o.metadata->>'size')::bigint), 0)::bigint,
    COUNT(*)::bigint
  FROM storage.objects o GROUP BY o.bucket_id;
END;
$$;

REVOKE ALL ON FUNCTION public.obtener_uso_storage() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.obtener_uso_storage() TO service_role;
```

---

## Personalización visual

Desde `/admin/dashboard/perfil` → pestaña **Colores**:

- **Tema base** — 5 opciones: Claro, Oscuro, Midnight, Cálido, Océano. Cambia fondos, cards y textos.
- **Color de acento** — 28 paletas predefinidas para botones y elementos interactivos.

---

## Módulo Utilidades (`_062`)

`/admin/dashboard/utilidades` — análisis de rentabilidad real por producto.

### Configuración

1. Ir a cada producto → campo **Precio de costo** (solo visible en admin, nunca en tienda)
2. Una vez ingresado el costo, el módulo de utilidades calculará el margen real

### Funcionalidades

- **Tabla dinámica** con columnas ordenables: producto, unidades vendidas, ingresos totales, costo, utilidad neta, margen %
- **Rango de fechas** configurable — por defecto el mes en curso
- **Precio de venta** muestra rango min–max con badge "varía" si el producto fue negociado a distintos precios
- **Filas en rojo** cuando la utilidad es negativa
- **Fila de totales** al pie de la tabla
- **Aviso** con lista de productos sin precio de costo configurado (con enlace directo a editarlos)
- **Detalle por producto** (`/utilidades/[productoId]`) — lista cada venta individual con fecha, N° pedido, cliente, precio cobrado, cantidad, costo unitario y utilidad

### SQL requerido (nuevo cliente)

```sql
-- Migración _062
ALTER TABLE productos ADD COLUMN IF NOT EXISTS precio_costo DECIMAL(10,2) DEFAULT NULL;
-- (+ funciones calcular_utilidades y ventas_producto — incluidas en schema.sql)
```

**Migración:** `supabase/migrations/20260518000062_precio_costo_utilidades.sql`

---

## Módulo Cuentas por Cobrar (`_063`)

Gestión de ventas a crédito realizadas desde el POS. No aplica a la tienda online.

### Configuración inicial

1. Ir a **Perfil → pestaña Crédito**
2. Activar **"Crédito activo"**
3. Definir el máximo de cuotas permitidas
4. Opcionalmente activar interés mensual e ingresar la tasa

### Flujo de una venta a crédito

1. En el POS (`/admin/dashboard/venta-nueva`) aparece la sección **"Venta a crédito"** cuando hay productos en el carrito
2. El admin activa el toggle, elige frecuencia (mensual / quincenal / semanal) y número de cuotas (mínimo 2)
3. El sistema muestra el plan de pagos con fechas:
   - **Cuota 1 → se cobra hoy** (entrada, marcada en verde)
   - **Cuotas siguientes** → vencen según la frecuencia elegida
4. El interés se calcula sobre el período diferido: `total × tasa × (n-1) períodos`
5. Al registrar la venta: cuota 1 queda marcada como `pagado` automáticamente y el saldo pendiente ya la descuenta

### Panel de Cuentas por Cobrar

`/admin/dashboard/cuentas-cobrar`

- **Tarjetas resumen**: total por cobrar, monto vencido, vencimientos en 7 días, número de cuentas activas
- **Filtros**: Todos / Vencido / Por vencer / Al día
- **Tabla** con estado visual por pedido (badge color según estado más grave de las cuotas)

**Detalle por cuenta** (`/cuentas-cobrar/[pedidoId]`):

- Plan de cuotas completo con estado individual (pagado / pendiente / vencido)
- Barra de progreso de pago
- Historial de abonos registrados
- **Modal "Abonar"**: registra el pago en `abonos_credito`, marca la cuota como pagada si el monto la cubre y descuenta del saldo pendiente

### Vista del cliente

En `/pedido/[numero]` — si el pedido es a crédito, el cliente ve su plan de cuotas con estado visual (verde = pagado, rojo = vencido, gris = pendiente).

### SQL requerido (nuevo cliente)

```sql
-- Migración _063 (incluida en schema.sql)
-- Agrega columnas de crédito a configuracion_tienda y pedidos
-- Crea tablas cuotas_credito y abonos_credito con RLS
-- Crea función marcar_cuotas_vencidas()
```

**Migración:** `supabase/migrations/20260518000063_cuentas_por_cobrar.sql`

---

## Validación de identificaciones tributarias (`_064`)

El sistema valida matemáticamente las cédulas y RUC ecuatorianos antes de guardarlos, tanto en el formulario frontend como a nivel de base de datos.

### Algoritmos implementados

| Tipo | Algoritmo | Verificación |
|------|-----------|-------------|
| Cédula | Módulo 10 | Dígito verificador posición 10 |
| RUC persona natural | Módulo 10 (primeros 10 dígitos = cédula) | Sufijo ≥ 001 |
| RUC persona jurídica | Módulo 11 (9 coeficientes) | Dígito verificador posición 10 |
| RUC entidad pública | Módulo 11 (8 coeficientes) | Dígito verificador posición 9 |
| Pasaporte | Regex `^[A-Z0-9]{5,20}$` | Formato alfanumérico |

### Dónde se aplica

- **Frontend**: `src/lib/sri/validar-identificacion.ts` — validación en tiempo real en el formulario de clientes (panel admin y POS). Muestra feedback inmediato con color de borde (verde = válido, naranja = inválido).
- **Base de datos**: CHECK constraint `clientes_identificacion_valida` en la tabla `clientes` — impide insertar o actualizar un cliente con identificación inválida aunque se acceda directamente a la BD.

### SQL requerido (nuevo cliente)

```sql
-- Migración _064 (incluida en schema.sql)
-- Crea funciones: validar_cedula_ecuador(), validar_ruc_ecuador(),
--                 validar_identificacion_cliente()
-- Agrega CHECK constraint a tabla clientes
```

**Migración:** `supabase/migrations/20260519000064_validacion_identificacion.sql`

> **Nota:** si el cliente ya tiene registros en la tabla `clientes` con identificaciones inválidas (p.ej. datos de prueba), el CHECK constraint fallará al ejecutar la migración. En ese caso, primero limpiar o corregir esos registros, luego ejecutar `_064`.

Ambos ajustes son independientes y se aplican en tiempo real sin redeploy. El color de acento también se aplica al menú superior del panel admin.
