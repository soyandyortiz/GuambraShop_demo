'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Mail, Plus, Play, Pause, Trash2, Upload,
  Users, CheckCircle2, XCircle, Clock, BarChart3,
  ChevronDown, ChevronUp, AlertCircle, Loader2, Send, Eye
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { crearClienteSupabase } from '@/lib/supabase/cliente'
import { ModalCampana }   from './modal-campana'
import { ModalImportar }  from './modal-importar'

interface Campana {
  id: string
  nombre: string
  asunto: string
  cuerpo: string
  estado: 'borrador' | 'activa' | 'pausada' | 'completada'
  total_contactos: number
  enviados: number
  errores: number
  creado_en: string
  iniciado_en: string | null
  completado_en: string | null
}

interface ContadorDia { enviados: number }

const LIMITE_DIARIO  = 50
const LIMITE_MENSUAL = 300

const ESTADO_CFG = {
  borrador:    { label: 'Borrador',   clase: 'bg-gray-100 text-gray-600 border-gray-200' },
  activa:      { label: 'Activa',     clase: 'bg-blue-50 text-blue-700 border-blue-200' },
  pausada:     { label: 'Pausada',    clase: 'bg-amber-50 text-amber-700 border-amber-200' },
  completada:  { label: 'Completada', clase: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
}

export function PanelEmailMarketing() {
  const router = useRouter()
  const [, startTransition] = useTransition()

  const [campanas,     setCampanas]     = useState<Campana[]>([])
  const [enviadosHoy,  setEnviadosHoy]  = useState(0)
  const [enviadosMes,  setEnviadosMes]  = useState(0)
  const [cargando,     setCargando]     = useState(true)
  const [modalCrear,   setModalCrear]   = useState(false)
  const [editando,     setEditando]     = useState<Campana | null>(null)
  const [importando,   setImportando]   = useState<Campana | null>(null)
  const [expandida,    setExpandida]    = useState<string | null>(null)
  const [operando,     setOperando]     = useState<string | null>(null)
  const cargandoRef = useRef(false)

  async function cargar() {
    if (cargandoRef.current) return
    cargandoRef.current = true
    const supabase = crearClienteSupabase()
    const hoy = new Date().toISOString().split('T')[0]
    const inicioMes = new Date(); inicioMes.setDate(1); inicioMes.setHours(0,0,0,0)

    const [{ data: camps }, { data: contDia }, { count: countMes }] = await Promise.all([
      supabase.from('campanas_email').select('*').order('creado_en', { ascending: false }),
      supabase.from('email_envios_diarios').select('enviados').eq('fecha', hoy).maybeSingle(),
      supabase.from('contactos_campana')
        .select('*', { count: 'exact', head: true })
        .eq('estado', 'enviado')
        .gte('enviado_en', inicioMes.toISOString()),
    ])

    setCampanas(camps ?? [])
    setEnviadosHoy((contDia as ContadorDia | null)?.enviados ?? 0)
    setEnviadosMes(countMes ?? 0)
    setCargando(false)
    cargandoRef.current = false
  }

  // Carga inicial
  useEffect(() => {
    cargar()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Polling liviano cada 30 s cuando hay campaña activa
  useEffect(() => {
    const hayActiva = campanas.some(c => c.estado === 'activa')
    if (!hayActiva) return
    const id = setInterval(cargar, 30_000)
    return () => clearInterval(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campanas])

  async function cambiarEstado(campana: Campana, nuevoEstado: 'activa' | 'pausada') {
    if (campana.total_contactos === 0) {
      toast.error('Importa contactos antes de iniciar la campaña')
      return
    }
    setOperando(campana.id)
    const supabase = crearClienteSupabase()
    const extra = nuevoEstado === 'activa' && !campana.iniciado_en
      ? { iniciado_en: new Date().toISOString() }
      : {}

    const { error } = await supabase
      .from('campanas_email')
      .update({ estado: nuevoEstado, ...extra })
      .eq('id', campana.id)

    if (error) { toast.error('Error al actualizar'); setOperando(null); return }

    toast.success(nuevoEstado === 'activa' ? '▶ Campaña activada' : '⏸ Campaña pausada')
    await cargar()
    setOperando(null)
    startTransition(() => router.refresh())
  }

  async function eliminar(campana: Campana) {
    if (!confirm(`¿Eliminar la campaña "${campana.nombre}" y todos sus contactos?`)) return
    setOperando(campana.id)
    const supabase = crearClienteSupabase()
    const { error } = await supabase.from('campanas_email').delete().eq('id', campana.id)
    if (error) { toast.error('Error al eliminar'); setOperando(null); return }
    toast.success('Campaña eliminada')
    await cargar()
    setOperando(null)
  }

  const pctDia = Math.min((enviadosHoy / LIMITE_DIARIO) * 100, 100)
  const pctMes = Math.min((enviadosMes / LIMITE_MENSUAL) * 100, 100)

  return (
    <div className="flex flex-col gap-6">

      {/* ── CUADROS DE LÍMITE ── */}
      <div className="grid grid-cols-2 gap-4">
        {/* Hoy */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Send className="w-4 h-4 text-foreground-muted" />
              <span className="text-xs font-bold text-foreground-muted uppercase tracking-widest">Enviados hoy</span>
            </div>
            <span className={cn('text-sm font-black', pctDia >= 100 ? 'text-red-600' : pctDia >= 80 ? 'text-amber-600' : 'text-foreground')}>
              {enviadosHoy} / {LIMITE_DIARIO}
            </span>
          </div>
          <div className="h-2 rounded-full bg-background-subtle overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all', pctDia >= 100 ? 'bg-red-500' : pctDia >= 80 ? 'bg-amber-500' : 'bg-primary')}
              style={{ width: `${pctDia}%` }}
            />
          </div>
          <p className="text-[10px] text-foreground-muted mt-2">
            {pctDia >= 100
              ? <span className="text-red-600 font-bold">⛔ Límite diario alcanzado</span>
              : `${LIMITE_DIARIO - enviadosHoy} disponibles · se renueva mañana`}
          </p>
        </div>

        {/* Mes */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-foreground-muted" />
              <span className="text-xs font-bold text-foreground-muted uppercase tracking-widest">Enviados este mes</span>
            </div>
            <span className={cn('text-sm font-black', pctMes >= 100 ? 'text-red-600' : pctMes >= 80 ? 'text-amber-600' : 'text-foreground')}>
              {enviadosMes} / {LIMITE_MENSUAL}
            </span>
          </div>
          <div className="h-2 rounded-full bg-background-subtle overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all', pctMes >= 100 ? 'bg-red-500' : pctMes >= 80 ? 'bg-amber-500' : 'bg-primary')}
              style={{ width: `${pctMes}%` }}
            />
          </div>
          <p className="text-[10px] text-foreground-muted mt-2">
            {pctMes >= 100
              ? <span className="text-red-600 font-bold">⛔ Límite mensual alcanzado</span>
              : `${LIMITE_MENSUAL - enviadosMes} disponibles · se renueva el 1 del mes`}
          </p>
        </div>
      </div>

      {/* ── AVISO CRON ── */}
      <div className="flex items-start gap-3 rounded-xl bg-blue-50 border border-blue-100 px-4 py-3">
        <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-blue-700 leading-relaxed">
          El sistema envía automáticamente hasta <strong>4 emails cada 2 horas</strong> desde campañas activas, respetando el límite de 50/día y 300/mes para proteger tu reputación con Gmail.
          Las variables disponibles en el cuerpo son: <code className="bg-blue-100 px-1 rounded">{'{{nombre}}'}</code> y <code className="bg-blue-100 px-1 rounded">{'{{tienda}}'}</code>
        </p>
      </div>

      {/* ── ENCABEZADO LISTA ── */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-foreground">Campañas de email</h3>
        <button
          onClick={() => setModalCrear(true)}
          className="flex items-center gap-2 h-9 px-4 rounded-xl bg-primary text-white text-sm font-bold shadow-md shadow-primary/20 hover:bg-primary/90 transition-all"
        >
          <Plus className="w-4 h-4" /> Nueva campaña
        </button>
      </div>

      {/* ── LISTA ── */}
      {cargando ? (
        <div className="flex items-center justify-center py-16 text-foreground-muted">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : campanas.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-foreground-muted/30">
          <Mail className="w-12 h-12" />
          <p className="text-sm font-bold">Aún no hay campañas</p>
          <p className="text-xs">Crea tu primera campaña para comenzar</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {campanas.map(campana => {
            const pct = campana.total_contactos > 0
              ? Math.round((campana.enviados / campana.total_contactos) * 100)
              : 0
            const cfg = ESTADO_CFG[campana.estado]
            const estaExpandida = expandida === campana.id
            const procesando = operando === campana.id

            return (
              <div key={campana.id} className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">

                {/* Fila principal */}
                <div className="px-5 py-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-5 h-5 text-primary" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-bold text-sm text-foreground truncate">{campana.nombre}</p>
                      <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold border flex-shrink-0', cfg.clase)}>
                        {cfg.label}
                      </span>
                    </div>
                    <p className="text-xs text-foreground-muted truncate">{campana.asunto}</p>

                    {/* Barra de progreso */}
                    {campana.total_contactos > 0 && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-foreground-muted">
                            {campana.enviados} / {campana.total_contactos} enviados
                            {campana.errores > 0 && <span className="text-red-500 ml-2">· {campana.errores} errores</span>}
                          </span>
                          <span className="text-[10px] font-bold text-foreground">{pct}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-background-subtle overflow-hidden">
                          <div
                            className={cn('h-full rounded-full transition-all duration-500',
                              campana.estado === 'completada' ? 'bg-emerald-500' :
                              campana.estado === 'activa'     ? 'bg-primary' :
                              'bg-gray-400'
                            )}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {campana.total_contactos === 0 && (
                      <p className="text-[10px] text-amber-600 mt-1 font-medium">⚠ Sin contactos — importa una lista para activar</p>
                    )}
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => setImportando(campana)}
                      title="Importar contactos"
                      className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-foreground-muted hover:text-primary hover:border-primary/40 transition-all"
                    >
                      <Upload className="w-3.5 h-3.5" />
                    </button>

                    {campana.estado === 'activa' ? (
                      <button
                        onClick={() => cambiarEstado(campana, 'pausada')}
                        disabled={procesando}
                        title="Pausar"
                        className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 hover:bg-amber-100 transition-all disabled:opacity-50"
                      >
                        {procesando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Pause className="w-3.5 h-3.5" />}
                      </button>
                    ) : campana.estado !== 'completada' ? (
                      <button
                        onClick={() => cambiarEstado(campana, 'activa')}
                        disabled={procesando}
                        title="Activar"
                        className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 hover:bg-emerald-100 transition-all disabled:opacity-50"
                      >
                        {procesando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                      </button>
                    ) : null}

                    <button
                      onClick={() => setEditando(campana)}
                      title="Editar"
                      className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-foreground-muted hover:text-foreground transition-all"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => eliminar(campana)}
                      disabled={procesando || campana.estado === 'activa'}
                      title={campana.estado === 'activa' ? 'Pausa la campaña antes de eliminar' : 'Eliminar'}
                      className="w-8 h-8 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center text-red-500 hover:bg-red-100 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => setExpandida(estaExpandida ? null : campana.id)}
                      className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-foreground-muted hover:text-foreground transition-all"
                    >
                      {estaExpandida ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Panel expandido */}
                {estaExpandida && (
                  <div className="border-t border-border bg-background-subtle/40 px-5 py-4">
                    <div className="grid grid-cols-4 gap-4 mb-3">
                      <Stat icono={<Users className="w-3.5 h-3.5" />}    label="Contactos" valor={campana.total_contactos} />
                      <Stat icono={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />} label="Enviados"  valor={campana.enviados} color="text-emerald-600" />
                      <Stat icono={<XCircle className="w-3.5 h-3.5 text-red-500" />}          label="Errores"   valor={campana.errores}  color="text-red-600" />
                      <Stat icono={<Clock className="w-3.5 h-3.5 text-amber-500" />}          label="Pendientes" valor={campana.total_contactos - campana.enviados - campana.errores} color="text-amber-600" />
                    </div>
                    <div className="rounded-xl bg-background border border-border p-3">
                      <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-widest mb-1">Vista previa del cuerpo</p>
                      <p className="text-xs text-foreground whitespace-pre-wrap line-clamp-4">{campana.cuerpo}</p>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── MODALES ── */}
      {(modalCrear || editando) && (
        <ModalCampana
          campana={editando ?? undefined}
          alCerrar={() => { setModalCrear(false); setEditando(null) }}
          alGuardar={() => { setModalCrear(false); setEditando(null); cargar() }}
        />
      )}

      {importando && (
        <ModalImportar
          campana={importando}
          alCerrar={() => setImportando(null)}
          alImportar={() => { setImportando(null); cargar() }}
        />
      )}
    </div>
  )
}

function Stat({ icono, label, valor, color = 'text-foreground' }: {
  icono: React.ReactNode; label: string; valor: number; color?: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-foreground-muted">{icono}<span className="text-[10px] uppercase tracking-wide font-semibold">{label}</span></div>
      <span className={cn('text-lg font-black', color)}>{valor}</span>
    </div>
  )
}
