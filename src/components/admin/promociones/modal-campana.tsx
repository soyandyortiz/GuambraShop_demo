'use client'

import { useState, useRef } from 'react'
import {
  X, Save, Loader2, Mail, Bold, List, Link2,
  Image as ImageIcon, Eye, EyeOff, CheckCircle2,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { crearClienteSupabase } from '@/lib/supabase/cliente'

// ── Types ──────────────────────────────────────────────────
interface Campana {
  id: string; nombre: string; asunto: string; cuerpo: string
  estado: string; total_contactos: number
}
interface Props {
  campana?: Campana
  alCerrar: () => void
  alGuardar: () => void
}

// ── Templates ──────────────────────────────────────────────
const PLANTILLAS = [
  {
    id: 'sencillo',
    nombre: 'Sencillo',
    desc: 'Texto directo, sin adornos',
    cuerpo: 'Hola {{nombre}},\n\n[Escribe tu mensaje aquí]\n\nGracias por confiar en {{tienda}}.',
  },
  {
    id: 'tarjeta',
    nombre: 'Tarjeta',
    desc: 'Recuadro destacado + botón',
    cuerpo: 'Hola {{nombre}},\n\n<div style="background:#eff6ff;border-left:4px solid #3b82f6;padding:16px 20px;border-radius:8px;margin:16px 0">\n  <strong>[Tu mensaje principal aquí]</strong>\n</div>\n\n[Detalles adicionales...]\n\n<div style="margin-top:20px">\n  <a href="[URL]" style="display:inline-block;background:#3b82f6;color:#ffffff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700">Ver más →</a>\n</div>',
  },
  {
    id: 'promo',
    nombre: 'Promoción',
    desc: 'Badge de oferta + botón rojo',
    cuerpo: '<div style="text-align:center;padding:8px 0">\n  <span style="background:#fef3c7;color:#d97706;padding:4px 14px;border-radius:20px;font-size:12px;font-weight:700">✨ OFERTA ESPECIAL</span>\n</div>\n\nHola {{nombre}},\n\n<h2 style="text-align:center;margin:16px 0 8px">[Título de la promoción]</h2>\n<p style="text-align:center;color:#6b7280">[Descripción breve de la oferta]</p>\n\n<div style="text-align:center;margin:24px 0">\n  <a href="[URL]" style="display:inline-block;background:#ef4444;color:#ffffff;padding:14px 36px;border-radius:10px;text-decoration:none;font-weight:700;font-size:16px">Aprovechar ahora</a>\n</div>',
  },
]

export const SEPARADOR_FIRMA = '\n\n<!-- FIRMA -->\n'

// ── Helpers ────────────────────────────────────────────────
function splitCuerpoFirma(cuerpo: string) {
  const idx = cuerpo.indexOf(SEPARADOR_FIRMA)
  if (idx >= 0) return { body: cuerpo.slice(0, idx), firma: cuerpo.slice(idx + SEPARADOR_FIRMA.length) }
  return { body: cuerpo, firma: '' }
}

async function comprimirImagen(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement('canvas')
      let { width, height } = img
      const MAX = 700
      if (width > MAX || height > MAX) {
        const r = Math.min(MAX / width, MAX / height)
        width = Math.round(width * r); height = Math.round(height * r)
      }
      canvas.width = width; canvas.height = height
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
      let q = 0.85, data = canvas.toDataURL('image/jpeg', q)
      while (data.length > 800_000 && q > 0.2) { q -= 0.1; data = canvas.toDataURL('image/jpeg', q) }
      resolve(data)
    }
    img.onerror = reject
    img.src = url
  })
}

function insertarEnCursor(
  ref: React.RefObject<HTMLTextAreaElement | null>,
  setter: (fn: (prev: string) => string) => void,
  antes: string,
  despues = '',
) {
  const el = ref.current
  if (!el) return
  const ini = el.selectionStart, fin = el.selectionEnd
  const sel = el.value.slice(ini, fin)
  setter(() => el.value.slice(0, ini) + antes + sel + despues + el.value.slice(fin))
  setTimeout(() => {
    el.focus()
    el.setSelectionRange(ini + antes.length, ini + antes.length + sel.length)
  }, 0)
}

// ── Component ──────────────────────────────────────────────
export function ModalCampana({ campana, alCerrar, alGuardar }: Props) {
  const esEdicion = !!campana

  const initial = campana?.cuerpo ? splitCuerpoFirma(campana.cuerpo) : { body: PLANTILLAS[0].cuerpo, firma: '' }

  const [nombre,      setNombre]    = useState(campana?.nombre ?? '')
  const [asunto,      setAsunto]    = useState(campana?.asunto ?? '')
  const [cuerpo,      setCuerpo]    = useState(initial.body)
  const [firma,       setFirma]     = useState(initial.firma)
  const [guardando,   setGuardando] = useState(false)
  const [preview,     setPreview]   = useState(false)
  const [plantilla,   setPlantilla] = useState('sencillo')
  const [errores,     setErrores]   = useState<Record<string, string>>({})

  const cuerpoRef = useRef<HTMLTextAreaElement>(null)
  const imgRef0   = useRef<HTMLInputElement>(null)
  const imgRef1   = useRef<HTMLInputElement>(null)
  const imgRef2   = useRef<HTMLInputElement>(null)
  const imgRefs   = [imgRef0, imgRef1, imgRef2]

  const numImgs = (cuerpo.match(/<img /g) ?? []).length

  // ── Plantilla ──────────────────────────────────────────
  function aplicarPlantilla(p: typeof PLANTILLAS[0]) {
    if (
      cuerpo.trim() &&
      cuerpo !== initial.body &&
      !confirm('¿Reemplazar el contenido actual con esta plantilla?')
    ) return
    setCuerpo(p.cuerpo)
    setPlantilla(p.id)
  }

  // ── Toolbar ────────────────────────────────────────────
  function insertarNegrita() {
    insertarEnCursor(cuerpoRef, setCuerpo, '<strong>', '</strong>')
  }
  function insertarLista() {
    insertarEnCursor(
      cuerpoRef, setCuerpo,
      '\n<ul style="margin:8px 0;padding-left:20px">\n  <li>Elemento 1</li>\n  <li>Elemento 2</li>\n  <li>Elemento 3</li>\n</ul>\n',
    )
  }
  function insertarEnlace() {
    const url = prompt('Escribe la URL del enlace:')
    if (!url) return
    insertarEnCursor(cuerpoRef, setCuerpo, `<a href="${url}" style="color:#3b82f6;font-weight:600">`, '</a>')
  }

  async function abrirImagen(idx: number) {
    if (numImgs >= 3) { toast.error('Máximo 3 imágenes por email'); return }
    imgRefs[idx].current?.click()
  }

  async function onImagenSeleccionada(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const tid = toast.loading('Comprimiendo imagen...')
    try {
      const b64 = await comprimirImagen(file)
      const kb = Math.round(b64.length * 0.75 / 1024)
      insertarEnCursor(
        cuerpoRef, setCuerpo,
        `\n<img src="${b64}" alt="imagen" style="max-width:100%;border-radius:8px;margin:8px 0">\n`,
      )
      toast.success(`Imagen insertada (${kb} KB)`, { id: tid })
    } catch {
      toast.error('No se pudo procesar la imagen', { id: tid })
    }
    e.target.value = ''
  }

  // ── Validación + guardado ──────────────────────────────
  function validar() {
    const e: Record<string, string> = {}
    if (nombre.trim().length < 2) e.nombre = 'Mínimo 2 caracteres'
    if (asunto.trim().length < 4) e.asunto = 'Mínimo 4 caracteres'
    if (cuerpo.trim().length < 10) e.cuerpo = 'Escribe el contenido del email'
    setErrores(e)
    return Object.keys(e).length === 0
  }

  async function guardar() {
    if (!validar()) return
    setGuardando(true)
    const supabase = crearClienteSupabase()
    const cuerpoFinal = cuerpo + (firma.trim() ? SEPARADOR_FIRMA + firma.trim() : '')
    const datos = { nombre: nombre.trim(), asunto: asunto.trim(), cuerpo: cuerpoFinal }

    if (esEdicion) {
      const { error } = await supabase.from('campanas_email').update(datos).eq('id', campana.id)
      if (error) { toast.error('Error al guardar'); setGuardando(false); return }
      toast.success('Campaña actualizada')
    } else {
      const { error } = await supabase.from('campanas_email').insert(datos)
      if (error) { toast.error('Error al crear'); setGuardando(false); return }
      toast.success('Campaña creada — ahora importa contactos con el ícono 📤')
    }
    alGuardar()
  }

  // ── Preview ────────────────────────────────────────────
  const previewBody = cuerpo
    .replace(/\{\{nombre\}\}/gi, 'Juan Pérez')
    .replace(/\{\{tienda\}\}/gi, 'Tu Tienda')

  // ── Render ─────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <Mail className="w-4 h-4 text-primary" />
            </div>
            <h2 className="font-bold text-foreground">{esEdicion ? 'Editar campaña' : 'Nueva campaña'}</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPreview(v => !v)}
              className={cn(
                'flex items-center gap-1.5 h-8 px-3 rounded-lg border text-xs font-semibold transition-all',
                preview
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border text-foreground-muted hover:text-foreground',
              )}
            >
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
              <label className="text-xs font-bold text-foreground uppercase tracking-wide">Nombre interno *</label>
              <input
                value={nombre} onChange={e => setNombre(e.target.value)}
                placeholder="Ej: Promo Mayo 2026"
                className={cls}
              />
              {errores.nombre && <p className="text-xs text-danger">{errores.nombre}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-foreground uppercase tracking-wide">Asunto del email *</label>
              <input
                value={asunto} onChange={e => setAsunto(e.target.value)}
                placeholder="¡Oferta especial para ti! 🎉"
                className={cls}
              />
              {errores.asunto && <p className="text-xs text-danger">{errores.asunto}</p>}
            </div>
          </div>

          {!preview ? (
            <>
              {/* Plantillas */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-foreground uppercase tracking-wide">Diseño del email</label>
                <div className="grid grid-cols-3 gap-2">
                  {PLANTILLAS.map(p => (
                    <button
                      key={p.id} type="button"
                      onClick={() => aplicarPlantilla(p)}
                      className={cn(
                        'flex flex-col items-start gap-1 p-3 rounded-xl border-2 text-left transition-all hover:border-primary/40',
                        plantilla === p.id ? 'border-primary bg-primary/5' : 'border-border bg-background-subtle',
                      )}
                    >
                      <div className="flex items-center justify-between w-full">
                        <p className="text-xs font-bold text-foreground">{p.nombre}</p>
                        {plantilla === p.id && <CheckCircle2 className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
                      </div>
                      <p className="text-[10px] text-foreground-muted leading-snug">{p.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Contenido */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wide">Contenido *</label>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-foreground-muted">Insertar variable:</span>
                    {['{{nombre}}', '{{tienda}}'].map(v => (
                      <button
                        key={v} type="button"
                        onClick={() => insertarEnCursor(cuerpoRef, setCuerpo, v)}
                        className="text-[10px] font-mono bg-background-subtle border border-border px-1.5 py-0.5 rounded hover:bg-primary/5 hover:border-primary/40 text-foreground transition-all"
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Toolbar */}
                <div className="flex items-center gap-1 px-2 py-1.5 rounded-t-xl border border-b-0 border-border bg-background-subtle">
                  <button type="button" onClick={insertarNegrita} title="Negrita"
                    className="w-8 h-7 rounded flex items-center justify-center text-foreground-muted hover:text-foreground hover:bg-card border border-transparent hover:border-border transition-all">
                    <Bold className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" onClick={insertarLista} title="Lista con viñetas"
                    className="w-8 h-7 rounded flex items-center justify-center text-foreground-muted hover:text-foreground hover:bg-card border border-transparent hover:border-border transition-all">
                    <List className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" onClick={insertarEnlace} title="Insertar enlace"
                    className="w-8 h-7 rounded flex items-center justify-center text-foreground-muted hover:text-foreground hover:bg-card border border-transparent hover:border-border transition-all">
                    <Link2 className="w-3.5 h-3.5" />
                  </button>

                  <div className="w-px h-4 bg-border mx-1" />

                  <span className="text-[10px] text-foreground-muted mr-1">Imágenes:</span>
                  {([0, 1, 2] as const).map(i => (
                    <button
                      key={i} type="button"
                      onClick={() => abrirImagen(i)}
                      disabled={numImgs >= 3 && numImgs <= i}
                      title={`Insertar imagen ${i + 1}`}
                      className={cn(
                        'flex items-center gap-1 h-7 px-2 rounded text-[11px] font-semibold border transition-all',
                        (cuerpo.match(/<img /g) ?? []).length > i
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                          : 'text-foreground-muted hover:text-foreground hover:bg-card border-transparent hover:border-border disabled:opacity-30',
                      )}
                    >
                      <ImageIcon className="w-3 h-3" /> {i + 1}
                    </button>
                  ))}

                  {/* Hidden file inputs — outside the map for stable hooks */}
                  <input ref={imgRef0} type="file" accept="image/*" className="hidden" onChange={onImagenSeleccionada} />
                  <input ref={imgRef1} type="file" accept="image/*" className="hidden" onChange={onImagenSeleccionada} />
                  <input ref={imgRef2} type="file" accept="image/*" className="hidden" onChange={onImagenSeleccionada} />
                </div>

                <textarea
                  ref={cuerpoRef}
                  value={cuerpo}
                  onChange={e => setCuerpo(e.target.value)}
                  rows={9}
                  placeholder="Escribe el cuerpo del email..."
                  className="w-full px-3 py-3 rounded-b-xl border border-t-0 border-input-border bg-input-bg text-foreground text-xs font-mono leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                {errores.cuerpo && <p className="text-xs text-danger">{errores.cuerpo}</p>}
                <p className="text-[10px] text-foreground-muted">Soporta HTML. Usa las variables y herramientas de arriba para dar formato.</p>
              </div>

              {/* Firma */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-foreground uppercase tracking-wide">
                  Firma del email
                  <span className="ml-2 text-foreground-muted normal-case font-normal">opcional — aparece al final separada del cuerpo</span>
                </label>
                <textarea
                  value={firma}
                  onChange={e => setFirma(e.target.value)}
                  rows={3}
                  placeholder={'Ej:\nEquipo Chakana Ecuador\n0982650929 · shop.chakanaecuador.com'}
                  className="w-full px-3 py-3 rounded-xl border border-input-border bg-input-bg text-foreground text-xs resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </>
          ) : (
            /* Vista previa */
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="bg-background-subtle px-4 py-2 border-b border-border">
                <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-widest">
                  Vista previa · {asunto || '(sin asunto)'}
                </p>
              </div>
              <div className="bg-[#f3f4f6] p-4">
                <div className="bg-white rounded-xl overflow-hidden shadow-sm max-w-sm mx-auto text-sm">
                  <div className="bg-slate-800 px-4 py-3 text-center">
                    <p className="text-white text-xs font-bold">Tu Tienda</p>
                  </div>
                  <div
                    className="px-5 py-4 text-gray-800 text-xs leading-relaxed"
                    dangerouslySetInnerHTML={{
                      __html: /<[a-z][^>]*>/i.test(previewBody)
                        ? previewBody
                        : previewBody.replace(/\n/g, '<br>'),
                    }}
                  />
                  {firma && (
                    <>
                      <div className="mx-5 border-t border-gray-200" />
                      <div className="px-5 py-3 text-[11px] text-gray-500 whitespace-pre-wrap">{firma}</div>
                    </>
                  )}
                  <div className="px-5 py-3 border-t border-gray-100 text-center text-[10px] text-gray-400">
                    Has recibido este email como cliente de nuestra tienda.
                  </div>
                </div>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={guardar}
            disabled={guardando}
            className="flex items-center justify-center gap-2 h-11 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 disabled:opacity-60 transition-all"
          >
            {guardando
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
              : <><Save className="w-4 h-4" /> {esEdicion ? 'Guardar cambios' : 'Crear campaña'}</>}
          </button>
        </div>
      </div>
    </div>
  )
}

const cls = 'w-full h-10 px-3 rounded-xl border border-input-border bg-input-bg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent'
