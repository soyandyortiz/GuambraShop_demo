import { createClient } from '@supabase/supabase-js'
import { enviarEmail } from '@/lib/email/enviar'

export const dynamic = 'force-dynamic'
export const maxDuration = 55

const LIMITE_DIARIO   = 50
const LIMITE_MENSUAL  = 300
const MAX_POR_RUN     = 4   // 4 emails × ~400ms ≈ 1.6s activo por ejecución

const SEP_FIRMA = '\n\n<!-- FIRMA -->\n'

function splitCuerpoFirma(cuerpo: string): { body: string; firma: string | null } {
  const idx = cuerpo.indexOf(SEP_FIRMA)
  if (idx >= 0) return { body: cuerpo.slice(0, idx), firma: cuerpo.slice(idx + SEP_FIRMA.length) }
  return { body: cuerpo, firma: null }
}

function plantillaHtml(opts: {
  cuerpo: string
  nombreTienda: string
  logoUrl: string | null
  asunto: string
}) {
  const logo = opts.logoUrl
    ? `<img src="${opts.logoUrl}" alt="${opts.nombreTienda}" style="max-height:60px;max-width:160px;margin-bottom:12px;object-fit:contain">`
    : ''

  const { body, firma } = splitCuerpoFirma(opts.cuerpo)
  const esHtml = /<[a-z][^>]*>/i.test(body)
  const bodyHtml = esHtml ? body : body.replace(/\n/g, '<br>')
  const firmaHtml = firma
    ? `<tr><td style="background:#f8fafc;border-top:1px solid #e5e7eb;padding:16px 32px;color:#6b7280;font-size:12px;white-space:pre-wrap">
        ${firma.replace(/\n/g, '<br>')}
       </td></tr>`
    : ''

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${opts.asunto}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:40px 16px">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">
        <tr><td style="background:#1e293b;padding:28px 32px;text-align:center">
          ${logo}
          <h2 style="color:#f8fafc;margin:0;font-size:18px;font-weight:700">${opts.nombreTienda}</h2>
        </td></tr>
        <tr><td style="background:#ffffff;padding:36px 32px;color:#111827;font-size:15px;line-height:1.7">
          ${bodyHtml}
        </td></tr>
        ${firmaHtml}
        <tr><td style="background:#f8fafc;border-top:1px solid #e5e7eb;padding:16px 32px;text-align:center;color:#9ca3af;font-size:11px">
          <p style="margin:0">${opts.nombreTienda} · Ecuador</p>
          <p style="margin:4px 0 0">Has recibido este email porque eres cliente de nuestra tienda.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const hoy = new Date().toISOString().split('T')[0]

  // ── Límite diario ────────────────────────────────────────────
  const { data: contadorDia } = await supabase
    .from('email_envios_diarios')
    .select('enviados')
    .eq('fecha', hoy)
    .maybeSingle()

  const enviadosHoy = contadorDia?.enviados ?? 0
  if (enviadosHoy >= LIMITE_DIARIO) {
    return Response.json({ ok: true, skip: 'limite_diario', enviados: enviadosHoy })
  }

  // ── Límite mensual ───────────────────────────────────────────
  const inicioMes = new Date()
  inicioMes.setDate(1); inicioMes.setHours(0, 0, 0, 0)

  const { count: enviadosMes } = await supabase
    .from('contactos_campana')
    .select('*', { count: 'exact', head: true })
    .eq('estado', 'enviado')
    .gte('enviado_en', inicioMes.toISOString())

  if ((enviadosMes ?? 0) >= LIMITE_MENSUAL) {
    return Response.json({ ok: true, skip: 'limite_mensual', mes: enviadosMes })
  }

  // ── Campañas activas ─────────────────────────────────────────
  const { data: campanas } = await supabase
    .from('campanas_email')
    .select('id, nombre, asunto, cuerpo')
    .eq('estado', 'activa')

  if (!campanas?.length) {
    return Response.json({ ok: true, skip: 'sin_campanas_activas' })
  }

  // ── Config de email ──────────────────────────────────────────
  const [{ data: cfgEmail }, { data: cfgTienda }] = await Promise.all([
    supabase.from('configuracion_email')
      .select('proveedor, smtp_host, smtp_port, smtp_usuario, smtp_password, resend_api_key, from_email, from_nombre, activo')
      .maybeSingle(),
    supabase.from('configuracion_tienda')
      .select('nombre_tienda, logo_url, foto_perfil_url')
      .single(),
  ])

  if (!cfgEmail?.activo) {
    return Response.json({ ok: true, skip: 'email_no_configurado' })
  }

  const config = {
    proveedor:      cfgEmail.proveedor,
    smtp_host:      cfgEmail.smtp_host,
    smtp_port:      cfgEmail.smtp_port ?? 587,
    smtp_usuario:   cfgEmail.smtp_usuario,
    smtp_password:  cfgEmail.smtp_password,
    resend_api_key: cfgEmail.resend_api_key,
    from_email:     cfgEmail.from_email,
    from_nombre:    cfgEmail.from_nombre,
  }

  const nombreTienda = cfgTienda?.nombre_tienda ?? 'Tienda'
  const logoUrl      = cfgTienda?.logo_url ?? cfgTienda?.foto_perfil_url ?? null

  // ── Contactos pendientes ─────────────────────────────────────
  const porProcesar = Math.min(LIMITE_DIARIO - enviadosHoy, MAX_POR_RUN)
  const campanaIds  = campanas.map(c => c.id)

  const { data: contactos } = await supabase
    .from('contactos_campana')
    .select('id, nombre, email, campana_id')
    .eq('estado', 'pendiente')
    .in('campana_id', campanaIds)
    .order('creado_en')
    .limit(porProcesar)

  if (!contactos?.length) {
    // Marcar campañas completadas si no quedan pendientes
    for (const c of campanas) {
      const { count } = await supabase
        .from('contactos_campana')
        .select('*', { count: 'exact', head: true })
        .eq('campana_id', c.id)
        .eq('estado', 'pendiente')

      if ((count ?? 0) === 0) {
        await supabase.from('campanas_email')
          .update({ estado: 'completada', completado_en: new Date().toISOString() })
          .eq('id', c.id)
      }
    }
    return Response.json({ ok: true, skip: 'sin_contactos_pendientes' })
  }

  // ── Envío ────────────────────────────────────────────────────
  let enviados = 0
  let errores  = 0
  const contadoresPorCampana: Record<string, { env: number; err: number }> = {}

  for (const contacto of contactos) {
    const campana = campanas.find(c => c.id === contacto.campana_id)
    if (!campana) continue

    if (!contadoresPorCampana[campana.id]) {
      contadoresPorCampana[campana.id] = { env: 0, err: 0 }
    }

    const cuerpoFinal = campana.cuerpo
      .replace(/\{\{nombre\}\}/gi,  contacto.nombre ?? 'Cliente')
      .replace(/\{\{email\}\}/gi,   contacto.email)
      .replace(/\{\{tienda\}\}/gi,  nombreTienda)

    try {
      await enviarEmail({
        config,
        to:      contacto.email,
        subject: campana.asunto,
        html:    plantillaHtml({ cuerpo: cuerpoFinal, nombreTienda, logoUrl, asunto: campana.asunto }),
      })

      await supabase.from('contactos_campana')
        .update({ estado: 'enviado', enviado_en: new Date().toISOString(), error_msg: null })
        .eq('id', contacto.id)

      contadoresPorCampana[campana.id].env++
      enviados++
    } catch (err) {
      await supabase.from('contactos_campana')
        .update({ estado: 'error', error_msg: String(err) })
        .eq('id', contacto.id)

      contadoresPorCampana[campana.id].err++
      errores++
    }
  }

  // ── Actualizar contadores de campaña ─────────────────────────
  for (const [campanaId, cnt] of Object.entries(contadoresPorCampana)) {
    const campana = campanas.find(c => c.id === campanaId)
    if (!campana) continue

    // Leer valor actual para sumar correctamente
    const { data: actual } = await supabase
      .from('campanas_email')
      .select('enviados, errores')
      .eq('id', campanaId)
      .single()

    await supabase.from('campanas_email')
      .update({
        enviados: (actual?.enviados ?? 0) + cnt.env,
        errores:  (actual?.errores  ?? 0) + cnt.err,
      })
      .eq('id', campanaId)
  }

  // ── Actualizar contador diario ───────────────────────────────
  if (enviados > 0) {
    await supabase.from('email_envios_diarios')
      .upsert({ fecha: hoy, enviados: enviadosHoy + enviados })
  }

  return Response.json({ ok: true, enviados, errores, porProcesar })
}
