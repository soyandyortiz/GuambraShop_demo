'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import { X, Save, Loader2, Mail } from 'lucide-react'
import { toast } from 'sonner'
import { crearClienteSupabase } from '@/lib/supabase/cliente'

const esquema = z.object({
  nombre: z.string().min(2, 'Mínimo 2 caracteres'),
  asunto: z.string().min(4, 'Mínimo 4 caracteres'),
  cuerpo: z.string().min(10, 'Escribe el contenido del email'),
})
type Campos = z.infer<typeof esquema>

interface Campana {
  id: string; nombre: string; asunto: string; cuerpo: string
  estado: string; total_contactos: number
}

interface Props {
  campana?: Campana
  alCerrar: () => void
  alGuardar: () => void
}

export function ModalCampana({ campana, alCerrar, alGuardar }: Props) {
  const [guardando, setGuardando] = useState(false)
  const esEdicion = !!campana

  const { register, handleSubmit, watch, formState: { errors } } = useForm<Campos>({
    resolver: zodResolver(esquema),
    defaultValues: {
      nombre: campana?.nombre ?? '',
      asunto: campana?.asunto ?? '',
      cuerpo: campana?.cuerpo ?? '',
    },
  })

  const cuerpo = watch('cuerpo')
  const asunto = watch('asunto')

  async function onSubmit(datos: Campos) {
    setGuardando(true)
    const supabase = crearClienteSupabase()

    if (esEdicion) {
      const { error } = await supabase.from('campanas_email').update(datos).eq('id', campana.id)
      if (error) { toast.error('Error al guardar'); setGuardando(false); return }
      toast.success('Campaña actualizada')
    } else {
      const { error } = await supabase.from('campanas_email').insert(datos)
      if (error) { toast.error('Error al crear'); setGuardando(false); return }
      toast.success('Campaña creada — ahora importa tus contactos')
    }
    alGuardar()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <Mail className="w-4 h-4 text-primary" />
            </div>
            <h2 className="font-bold text-foreground">{esEdicion ? 'Editar campaña' : 'Nueva campaña'}</h2>
          </div>
          <button onClick={alCerrar} className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-foreground-muted hover:text-foreground transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-foreground">Nombre interno *</label>
            <input {...register('nombre')} placeholder="Ej: Promoción Mayo 2026"
              className={cls} />
            {errors.nombre && <p className="text-xs text-danger">{errors.nombre.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-foreground">Asunto del email *</label>
            <input {...register('asunto')} placeholder="Ej: ¡Oferta especial solo para ti! 🎉"
              className={cls} />
            {errors.asunto && <p className="text-xs text-danger">{errors.asunto.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-foreground">Cuerpo del email *</label>
              <span className="text-[10px] text-foreground-muted bg-background-subtle px-2 py-0.5 rounded-full border border-border">
                {'{{nombre}}'} · {'{{tienda}}'} disponibles
              </span>
            </div>
            <textarea {...register('cuerpo')} rows={8}
              placeholder={`Hola {{nombre}},\n\nTenemos una oferta especial para ti...\n\nSaludos,\n{{tienda}}`}
              className={`${cls} h-auto py-3 resize-none font-mono text-xs`} />
            {errors.cuerpo && <p className="text-xs text-danger">{errors.cuerpo.message}</p>}
            <p className="text-[10px] text-foreground-muted">Puedes usar HTML o texto plano. Los saltos de línea se convierten automáticamente.</p>
          </div>

          {/* Preview */}
          {cuerpo.length > 5 && (
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="bg-background-subtle px-4 py-2 border-b border-border">
                <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-widest">Vista previa del email</p>
              </div>
              <div className="bg-[#f3f4f6] px-4 py-4">
                <div className="bg-white rounded-xl overflow-hidden shadow-sm max-w-sm mx-auto text-sm">
                  <div className="bg-slate-800 px-4 py-3 text-center">
                    <p className="text-white text-xs font-bold">Tu tienda</p>
                  </div>
                  <div className="px-5 py-4 text-gray-800 text-xs leading-relaxed whitespace-pre-wrap">
                    {cuerpo
                      .replace(/\{\{nombre\}\}/gi, 'Juan')
                      .replace(/\{\{tienda\}\}/gi,  'Tu tienda')}
                  </div>
                  <div className="px-5 py-3 border-t border-gray-100 text-center text-[10px] text-gray-400">
                    {asunto || 'Asunto del email'}
                  </div>
                </div>
              </div>
            </div>
          )}

          <button type="submit" disabled={guardando}
            className="flex items-center justify-center gap-2 h-11 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 disabled:opacity-60 transition-all">
            {guardando
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
              : <><Save className="w-4 h-4" /> {esEdicion ? 'Guardar cambios' : 'Crear campaña'}</>}
          </button>
        </form>
      </div>
    </div>
  )
}

const cls = 'w-full h-10 px-3 rounded-xl border border-input-border bg-input-bg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent'
