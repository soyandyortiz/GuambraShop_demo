'use client'

import { useState, useRef } from 'react'
import {
  X, Save, Loader2, Mail, Eye, EyeOff,
  CheckCircle2, Image as ImageIcon, Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { crearClienteSupabase } from '@/lib/supabase/cliente'
import {
  buildCuerpo, parseCuerpo, renderBodyHtml, renderFirmaHtml,
  type TemplateId, type CamposCampana,
} from '@/lib/email/templates'

// ── Types ──────────────────────────────────────────────────
interface Campana {
  id: string; nombre: string; asunto: string; cuerpo: string
  estado: string; total_contactos: number
}
interface Props {
  campana?: Campana
  alCerrar: () => void
  alGuardar: (campanaId?: string) => void
}

// ── Templates UI config ────────────────────────────────────
const TEMPLATES: { id: TemplateId; nombre: string; desc: string }[] = [
  { id: 'mensaje',   nombre: 'Mensaje',   desc: 'Texto claro y directo' },
  { id: 'destacado', nombre: 'Destacado', desc: 'Con botón de acción' },
  { id: 'noticia',   nombre: 'Noticia',   desc: 'Titular + cuerpo + botón' },
]

// ── Image compression ──────────────────────────────────────
async function comprimirImagen(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement('canvas')
      let { width, height } = img
      const MAX = 720
      if (width > MAX || height > MAX) {
        const r = Math.min(MAX / width, MAX / height)
        width = Math.round(width * r); height = Math.round(height * r)
      }
      canvas.width = width; canvas.height = height
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
      let q = 0.85, data = canvas.toDataURL('image/jpeg', q)
      while (data.length > 600_000 && q > 0.2) { q -= 0.1; data = canvas.toDataURL('image/jpeg', q) }
      resolve(data)
    }
    img.onerror = reject
    img.src = url
  })
}

// ── Component ──────────────────────────────────────────────
export function ModalCampana({ campana, alCerrar, alGuardar }: Props) {
  const esEdicion = !!campana
  const parsed = campana?.cuerpo ? parseCuerpo(campana.cuerpo) : null

  const [nombre,    setNombre]    = useState(campana?.nombre ?? '')
  const [asunto,    setAsunto]    = useState(campana?.asunto ?? '')
  const [template,  setTemplate]  = useState<TemplateId>(parsed?.template ?? 'mensaje')
  const [texto,     setTexto]     = useState(
    parsed?.texto ?? 'Hola {{nombre}},\n\nEscribe tu mensaje aquí.\n\nGracias por confiar en {{tienda}}.'
  )
  const [campos,    setCampos]    = useState<CamposCampana>(
    parsed?.campos ?? { titulo: '', cta_texto: '', cta_url: '' }
  )
  const [firma,     setFirma]     = useState(parsed?.firma ?? '')
  const [imagenB64, setImagenB64] = useState<string | null>(parsed?.imagenB64 ?? null)
  const [guardando, setGuardando] = useState(false)
  const [preview,   setPreview]   = useState(false)
  const [errores,   setErrores]   = useState<Record<string, string>>({})

  const imgRef   = useRef<HTMLInputElement>(null)
  const textoRef = useRef<HTMLTextAreaElement>(null)

  function setCampo(k: keyof CamposCampana, v: string) {
    setCampos(p => ({ ...p, [k]: v }))
  }

  function insertarVariable(v: string) {
    const ta = textoRef.current
    if (!ta) return
    const ini = ta.selectionStart, fin = ta.selectionEnd
    setTexto(texto.slice(0, ini) + v + texto.slice(fin))
    setTimeout(() => { ta.focus(); ta.setSelectionRange(ini + v.length, ini + v.length) }, 0)
  }

  async function onImagen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const tid = toast.loading('Comprimiendo imagen...')
    try {
      const b64 = await comprimirImagen(file)
      setImagenB64(b64)
      toast.success(`Imagen lista (${Math.round(b64.length * 0.75 / 1024)} KB)`, { id: tid })
    } catch {
      toast.error('No se pudo procesar la imagen', { id: tid })
    }
    e.target.value = ''
  }

  function validar() {
    const e: Record<string, string> = {}
    if (nombre.trim().length < 2) e.nombre = 'Mínimo 2 caracteres'
    if (asunto.trim().length < 4) e.asunto = 'Mínimo 4 caracteres'
    if (texto.trim().length < 10) e.cuerpo = 'Escribe el contenido del email'
    setErrores(e)
    return Object.keys(e).length === 0
  }

  async function guardar() {
    if (!validar()) return
    setGuardando(true)
    const supabase = crearClienteSupabase()
    const cuerpoFinal = buildCuerpo({ template, campos, texto: texto.trim(), imagenB64, firma })
    const datos = { nombre: nombre.trim(), asunto: asunto.trim(), cuerpo: cuerpoFinal }

    if (esEdicion) {
      const { error } = await supabase.from('campanas_email').update(datos).eq('id', campana.id)
      if (error) { toast.error('Error al guardar'); setGuardando(false); return }
      toast.success('Campaña actualizada')
      alGuardar()
    } else {
      const { data, error } = await supabase.from('campanas_email').insert(datos).select('id').single()
      if (error || !data) { toast.error('Error al crear'); setGuardando(false); return }
      toast.success('Mensaje creado')
      alGuardar(data.id)
    }
  }

  // Preview rendering
  const previewTexto = texto
    .replace(/\{\{nombre\}\}/gi, 'Juan Pérez')
    .replace(/\{\{tienda\}\}/gi, 'Tu Tienda')

  const previewBody  = renderBodyHtml({ template, campos, texto: previewTexto, imagenB64 })
  const previewFirma = renderFirmaHtml(firma)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <Mail className="w-4 h-4 text-primary" />
            </div>
            <h2 className="font-bold text-foreground">{esEdicion ? 'Editar mensaje' : 'Crear mensaje'}</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPreview(v => !v)}
              className={cn(
                'flex items-center gap-1.5 h-8 px-3 rounded-lg border text-xs font-semibold transition-all',
                preview ? 'border-primary bg-primary/5 text-primary' : 'border-border text-foreground-muted hover:text-foreground',
              )}>
              {preview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {preview ? 'Editar' : 'Vista previa'}
            </button>
            <button onClick={alCerrar} className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-foreground-muted hover:text-foreground transition-all">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">

          {/* Nombre + Asunto */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider">Nombre interno</label>
              <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Promo Mayo 2026" className={iCls} />
              {errores.nombre && <p className="text-xs text-danger">{errores.nombre}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider">Asunto del email</label>
              <input value={asunto} onChange={e => setAsunto(e.target.value)} placeholder="¡Oferta especial para ti! 🎉" className={iCls} />
              {errores.asunto && <p className="text-xs text-danger">{errores.asunto}</p>}
            </div>
          </div>

          {!preview ? (
            <>
              {/* Diseño */}
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider">Diseño del email</label>
                <div className="grid grid-cols-3 gap-2">
                  {TEMPLATES.map(t => (
                    <button key={t.id} type="button" onClick={() => setTemplate(t.id)}
                      className={cn(
                        'flex flex-col gap-0.5 p-3 rounded-xl border-2 text-left transition-all',
                        template === t.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/30 bg-background-subtle',
                      )}>
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-bold text-foreground">{t.nombre}</span>
                        {template === t.id && <CheckCircle2 className="w-3.5 h-3.5 text-primary" />}
                      </div>
                      <span className="text-[10px] text-foreground-muted">{t.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Titular (solo noticia) */}
              {template === 'noticia' && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider">Titular del email</label>
                  <input value={campos.titulo} onChange={e => setCampo('titulo', e.target.value)}
                    placeholder="Ej: ¡Gran oferta de temporada!" className={iCls} />
                </div>
              )}

              {/* Texto del mensaje */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider">Texto del mensaje</label>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-foreground-muted">Insertar:</span>
                    {['{{nombre}}', '{{tienda}}'].map(v => (
                      <button key={v} type="button" onClick={() => insertarVariable(v)}
                        className="font-mono text-[10px] bg-background-subtle border border-border px-1.5 py-0.5 rounded hover:bg-primary/5 hover:border-primary/40 transition-all text-foreground">
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  ref={textoRef}
                  value={texto} onChange={e => setTexto(e.target.value)}
                  rows={8}
                  placeholder={`Hola {{nombre}},\n\nEscribe tu mensaje aquí...\n\nSaludos, {{tienda}}`}
                  className="w-full px-3 py-3 rounded-xl border border-input-border bg-input-bg text-foreground text-sm leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                {errores.cuerpo && <p className="text-xs text-danger">{errores.cuerpo}</p>}
              </div>

              {/* Imagen + CTA */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider">
                    Imagen <span className="normal-case font-normal">(opcional)</span>
                  </label>
                  {imagenB64 ? (
                    <div className="relative rounded-xl overflow-hidden border border-border h-28">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imagenB64} alt="" className="w-full h-full object-cover" />
                      <button onClick={() => setImagenB64(null)}
                        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-all">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => imgRef.current?.click()}
                      className="h-28 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 text-foreground-muted hover:border-primary/40 hover:text-primary transition-all">
                      <ImageIcon className="w-5 h-5" />
                      <span className="text-xs font-medium">Subir imagen</span>
                      <span className="text-[10px] text-foreground-muted/60">Se comprime automáticamente</span>
                    </button>
                  )}
                  <input ref={imgRef} type="file" accept="image/*" className="hidden" onChange={onImagen} />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider">
                    Botón de acción <span className="normal-case font-normal">(opcional)</span>
                  </label>
                  <input value={campos.cta_texto} onChange={e => setCampo('cta_texto', e.target.value)}
                    placeholder="Texto del botón" className={iCls} />
                  <input value={campos.cta_url} onChange={e => setCampo('cta_url', e.target.value)}
                    placeholder="https://..." className={iCls} />
                  {campos.cta_texto && !campos.cta_url && (
                    <p className="text-[10px] text-amber-600">Agrega también la URL</p>
                  )}
                </div>
              </div>

              {/* Firma */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider">
                  Firma del email <span className="normal-case font-normal text-foreground-muted">(opcional)</span>
                </label>
                <textarea value={firma} onChange={e => setFirma(e.target.value)} rows={3}
                  placeholder={'Nombre Apellido\nCargo · Empresa\n📞 0982650929  ·  🌐 shop.tutienda.com'}
                  className="w-full px-3 py-3 rounded-xl border border-input-border bg-input-bg text-foreground text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" />
                <p className="text-[10px] text-foreground-muted">
                  Primera línea = tu nombre (en negrita). Las siguientes aparecen como datos de contacto.
                </p>
              </div>
            </>
          ) : (
            /* ── Vista previa estilo Gmail ── */
            <div className="rounded-xl border border-[#e0e0e0] overflow-hidden shadow-sm">
              {/* Barra superior tipo Gmail */}
              <div className="bg-[#f2f6fc] px-5 py-3 border-b border-[#e0e0e0]">
                <h3 className="font-semibold text-[15px] text-gray-900">{asunto || '(sin asunto)'}</h3>
              </div>
              {/* Encabezado remitente */}
              <div className="bg-white px-5 py-3 border-b border-gray-100 flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-white text-sm font-bold flex-shrink-0 mt-0.5">T</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-[13px] text-gray-900">Tu Tienda</span>
                    <span className="text-[12px] text-gray-500">&lt;noreply@tutienda.com&gt;</span>
                  </div>
                  <div className="text-[12px] text-gray-400 mt-0.5">Para: Juan Pérez &lt;juan@ejemplo.com&gt;</div>
                </div>
                <span className="text-[11px] text-gray-400 flex-shrink-0 mt-1">Hoy 10:30 AM</span>
              </div>
              {/* Cuerpo del email (simula el outer wrapper) */}
              <div className="bg-[#f1f5f9] p-5">
                <div className="bg-white rounded-xl max-w-[480px] mx-auto overflow-hidden"
                  style={{ border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
                  {/* Header del email */}
                  <div style={{ background: '#0f172a', padding: '22px 28px', textAlign: 'center' }}>
                    <p style={{ color: '#f8fafc', margin: 0, fontSize: 16, fontWeight: 700 }}>Tu Tienda</p>
                  </div>
                  {/* Body */}
                  <div style={{ padding: '28px 28px 24px', fontSize: 14, color: '#111827', lineHeight: 1.75 }}>
                    <div dangerouslySetInnerHTML={{ __html: previewBody }} />
                    {firma && <div dangerouslySetInnerHTML={{ __html: previewFirma }} />}
                  </div>
                  {/* Footer */}
                  <div style={{ padding: '14px 28px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', textAlign: 'center' }}>
                    <p style={{ margin: 0, color: '#94a3b8', fontSize: 11 }}>Tu Tienda · Ecuador</p>
                    <p style={{ margin: '3px 0 0', color: '#cbd5e1', fontSize: 11 }}>
                      Has recibido este email porque eres cliente de nuestra tienda.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <button type="button" onClick={guardar} disabled={guardando}
            className="flex items-center justify-center gap-2 h-11 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 disabled:opacity-60 transition-all">
            {guardando
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
              : <><Save className="w-4 h-4" /> {esEdicion ? 'Guardar cambios' : 'Crear campaña'}</>}
          </button>
        </div>
      </div>
    </div>
  )
}

const iCls = 'w-full h-10 px-3 rounded-xl border border-input-border bg-input-bg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent'
