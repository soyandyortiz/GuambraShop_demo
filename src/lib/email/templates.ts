// Shared email template rendering — used by modal-campana (client) and procesar/route (server)

export type TemplateId = 'mensaje' | 'destacado' | 'noticia'
export interface CamposCampana { titulo: string; cta_texto: string; cta_url: string }

const SEP_IMG_START = '\n<!-- IMAGEN -->\n'
const SEP_IMG_END   = '\n<!-- /IMAGEN -->'
export const SEP_FIRMA = '\n<!-- FIRMA -->\n'

// ── Encode / decode ────────────────────────────────────────

export function buildCuerpo(opts: {
  template: TemplateId
  campos: CamposCampana
  texto: string
  imagenB64: string | null
  firma: string
}): string {
  let out = `<!-- TEMPLATE:${opts.template} -->\n`
  out += `<!-- CAMPOS:${JSON.stringify(opts.campos)} -->\n`
  out += opts.texto.trim()
  if (opts.imagenB64) out += `${SEP_IMG_START}${opts.imagenB64}${SEP_IMG_END}`
  if (opts.firma.trim()) out += `${SEP_FIRMA}${opts.firma.trim()}`
  return out
}

export function parseCuerpo(raw: string): {
  template: TemplateId
  campos: CamposCampana
  texto: string
  imagenB64: string | null
  firma: string
} {
  const defaults: CamposCampana = { titulo: '', cta_texto: '', cta_url: '' }

  if (!raw.startsWith('<!-- TEMPLATE:')) {
    // Legacy: raw HTML or plain text
    const fi = raw.indexOf(SEP_FIRMA)
    return {
      template: 'mensaje',
      campos: defaults,
      texto: fi >= 0 ? raw.slice(0, fi) : raw,
      imagenB64: null,
      firma: fi >= 0 ? raw.slice(fi + SEP_FIRMA.length) : '',
    }
  }

  const tmpl  = raw.match(/<!-- TEMPLATE:(\w+) -->/)?.[1] ?? 'mensaje'
  const camposStr = raw.match(/<!-- CAMPOS:(\{.+?\}) -->/)?.[1] ?? '{}'
  const imgB64 = raw.match(/\n<!-- IMAGEN -->\n([\s\S]*?)\n<!-- \/IMAGEN -->/)?.[1] ?? null

  // Strip metadata lines + image block + firma
  let texto = raw
    .replace(/^<!-- TEMPLATE:\w+ -->\n/, '')
    .replace(/^<!-- CAMPOS:\{.+?\} -->\n/m, '')
    .replace(/\n<!-- IMAGEN -->[\s\S]*?<!-- \/IMAGEN -->/g, '')

  const fi = texto.indexOf(SEP_FIRMA)
  const firma = fi >= 0 ? texto.slice(fi + SEP_FIRMA.length) : ''
  if (fi >= 0) texto = texto.slice(0, fi)

  return {
    template: tmpl as TemplateId,
    campos: { ...defaults, ...JSON.parse(camposStr) },
    texto: texto.trim(),
    imagenB64: imgB64,
    firma,
  }
}

// ── HTML generation ────────────────────────────────────────

export function renderBodyHtml(opts: {
  template: TemplateId
  campos: CamposCampana
  texto: string          // already variable-substituted, plain text
  imagenB64: string | null
}): string {
  const lines = opts.texto.replace(/\n/g, '<br>')

  const imgHtml = opts.imagenB64
    ? `<div style="margin:20px 0 0"><img src="${opts.imagenB64}" alt="" style="max-width:100%;border-radius:8px;display:block"></div>`
    : ''

  const ctaHtml = opts.campos.cta_texto && opts.campos.cta_url
    ? `<div style="margin-top:28px">
        <a href="${opts.campos.cta_url}"
           style="display:inline-block;background:#1e293b;color:#ffffff;padding:13px 30px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;letter-spacing:0.1px">
          ${opts.campos.cta_texto} →
        </a>
       </div>`
    : ''

  if (opts.template === 'noticia') {
    const titulo = opts.campos.titulo
      ? `<h2 style="margin:0 0 18px;font-size:22px;font-weight:800;color:#0f172a;line-height:1.25;letter-spacing:-0.4px">
           ${opts.campos.titulo}
         </h2>`
      : ''
    return `${titulo}<p style="margin:0;line-height:1.8;color:#374151">${lines}</p>${imgHtml}${ctaHtml}`
  }

  if (opts.template === 'destacado') {
    return `<p style="margin:0;line-height:1.8;color:#374151">${lines}</p>${imgHtml}${ctaHtml}`
  }

  // mensaje (sencillo)
  return `<p style="margin:0;line-height:1.8;color:#374151">${lines}</p>${imgHtml}${ctaHtml}`
}

export function renderFirmaHtml(firma: string): string {
  if (!firma.trim()) return ''
  const lineas = firma.trim().split('\n').filter(Boolean)
  const [primera, ...resto] = lineas
  const detalles = resto.map(l =>
    `<div style="font-size:12px;color:#64748b;margin-top:2px;line-height:1.5">${l}</div>`
  ).join('')
  return `
<table cellpadding="0" cellspacing="0"
  style="width:100%;border-top:1px solid #e2e8f0;margin-top:28px;padding-top:20px">
  <tr>
    <td style="padding-left:14px;border-left:3px solid #334155">
      <div style="font-size:14px;font-weight:700;color:#0f172a;letter-spacing:-0.2px">${primera}</div>
      ${detalles}
    </td>
  </tr>
</table>`
}

// ── Outer email wrapper ────────────────────────────────────

export function plantillaHtml(opts: {
  cuerpo: string        // raw stored value (may be new or legacy format)
  asunto: string
  nombreTienda: string
  logoUrl: string | null
}) {
  const { template, campos, texto, imagenB64, firma } = parseCuerpo(opts.cuerpo)

  // Variable substitution is handled by caller before passing texto
  // Here we just render from the parsed values (caller does substitutions on texto externally)
  // But for legacy cuerpo (already substituted), we render it directly
  const bodyHtml = opts.cuerpo.startsWith('<!-- TEMPLATE:')
    ? renderBodyHtml({ template, campos, texto, imagenB64 })
    : (() => {
        const esHtml = /<[a-z][^>]*>/i.test(opts.cuerpo)
        const fi = opts.cuerpo.indexOf(SEP_FIRMA)
        const body = fi >= 0 ? opts.cuerpo.slice(0, fi) : opts.cuerpo
        return esHtml ? body : body.replace(/\n/g, '<br>')
      })()

  const firmaHtml = renderFirmaHtml(firma)
  const logo = opts.logoUrl
    ? `<img src="${opts.logoUrl}" alt="${opts.nombreTienda}"
         style="max-height:48px;max-width:140px;margin-bottom:8px;object-fit:contain;display:block;margin-left:auto;margin-right:auto">`
    : ''

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${opts.asunto}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:40px 16px">
      <table width="560" cellpadding="0" cellspacing="0"
        style="max-width:560px;width:100%;border-radius:16px;overflow:hidden;background:#ffffff;border:1px solid #e2e8f0">
        <tr>
          <td style="background:#0f172a;padding:24px 32px;text-align:center">
            ${logo}
            <p style="color:#f8fafc;margin:0;font-size:17px;font-weight:700;letter-spacing:-0.2px">${opts.nombreTienda}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 32px;color:#111827;font-size:15px;line-height:1.7">
            ${bodyHtml}
            ${firmaHtml}
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center">
            <p style="margin:0;color:#94a3b8;font-size:11px">${opts.nombreTienda} · Ecuador</p>
            <p style="margin:4px 0 0;color:#cbd5e1;font-size:11px">Has recibido este email porque eres cliente de nuestra tienda.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}
