'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  DollarSign, ClipboardList, TrendingUp, TrendingDown, Search,
  ArrowRight, Globe, Receipt, Banknote, ArrowLeftRight, CreditCard,
  MoreHorizontal, Package,
} from 'lucide-react'
import Link from 'next/link'
import { formatearPrecio } from '@/lib/utils'
import { cn } from '@/lib/utils'

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface ItemPedido {
  nombre: string
  cantidad: number
  subtotal: number
  variante?: string
}

interface Pedido {
  id: string
  numero_orden: string
  nombres: string
  total: number
  estado: string
  creado_en: string
  tipo: string
  simbolo_moneda: string
  forma_pago: string | null
  es_venta_manual: boolean | null
  items?: ItemPedido[]
}

interface Props {
  pedidos: Pedido[]
  desde: string
  hasta: string
  simboloMoneda: string
  totalAnterior: number
  pedidosAntCount: number
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const COLORES_ESTADO: Record<string, string> = {
  pendiente_pago: 'bg-gray-100 text-gray-600',
  procesando:     'bg-emerald-50 text-emerald-700',
  en_espera:      'bg-amber-50 text-amber-700',
  completado:     'bg-blue-50 text-blue-700',
  cancelado:      'bg-red-50 text-red-700',
  reembolsado:    'bg-gray-100 text-gray-500',
  fallido:        'bg-red-100 text-red-800',
}
const ETIQUETAS_ESTADO: Record<string, string> = {
  pendiente_pago: 'Pendiente',
  procesando:     'Procesando',
  en_espera:      'En espera',
  completado:     'Completado',
  cancelado:      'Cancelado',
  reembolsado:    'Reembolsado',
  fallido:        'Fallido',
}
const ETIQUETAS_PAGO: Record<string, string> = {
  efectivo:      'Efectivo',
  transferencia: 'Transferencia',
  tarjeta:       'Tarjeta',
  paypal:        'PayPal',
  payphone:      'Payphone',
  otro:          'Otro',
}

// ─── Gráfico de área SVG ──────────────────────────────────────────────────────

function GraficoArea({
  datos,
  simbolo,
}: {
  datos: { label: string; valor: number }[]
  simbolo: string
}) {
  const [hover, setHover] = useState<number | null>(null)

  if (datos.length === 0) return null

  const W = 600
  const H = 180
  const PAD = { top: 24, right: 12, bottom: 32, left: 52 }
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom

  const maxVal = Math.max(...datos.map(d => d.valor), 0.01)

  const points = datos.map((d, i) => ({
    x: PAD.left + (datos.length === 1 ? innerW / 2 : (i / (datos.length - 1)) * innerW),
    y: PAD.top + innerH - (d.valor / maxVal) * innerH,
    ...d,
  }))

  // Línea suave con curvas bezier
  const linePath = points.length < 2
    ? ''
    : points.reduce((acc, p, i) => {
        if (i === 0) return `M ${p.x.toFixed(1)} ${p.y.toFixed(1)}`
        const prev = points[i - 1]
        const cpx = ((prev.x + p.x) / 2).toFixed(1)
        return `${acc} C ${cpx} ${prev.y.toFixed(1)} ${cpx} ${p.y.toFixed(1)} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`
      }, '')

  const areaPath = linePath
    ? `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${(PAD.top + innerH).toFixed(1)} L ${points[0].x.toFixed(1)} ${(PAD.top + innerH).toFixed(1)} Z`
    : ''

  // Etiquetas eje Y (4 niveles)
  const ySteps = 4
  const yLabels = Array.from({ length: ySteps + 1 }, (_, i) => ({
    y: PAD.top + (i / ySteps) * innerH,
    val: maxVal * (1 - i / ySteps),
  }))

  // Cuántas etiquetas X mostrar
  const maxXLabels = 8
  const step = Math.ceil(datos.length / maxXLabels)

  return (
    <div className="relative w-full select-none">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        style={{ touchAction: 'none' }}
      >
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Grid horizontal */}
        {yLabels.map((l, i) => (
          <g key={i}>
            <line
              x1={PAD.left} y1={l.y.toFixed(1)}
              x2={W - PAD.right} y2={l.y.toFixed(1)}
              stroke="currentColor" strokeOpacity="0.07" strokeWidth="1"
            />
            <text
              x={PAD.left - 6} y={(l.y + 4).toFixed(1)}
              textAnchor="end" fontSize="10" fill="currentColor" fillOpacity="0.45"
            >
              {l.val >= 1000 ? `${(l.val / 1000).toFixed(1)}k` : l.val.toFixed(0)}
            </text>
          </g>
        ))}

        {/* Área */}
        {areaPath && <path d={areaPath} fill="url(#areaGrad)" />}

        {/* Línea */}
        {linePath && (
          <path
            d={linePath} fill="none"
            stroke="var(--primary)" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round"
          />
        )}

        {/* Puntos + zona hover */}
        {points.map((p, i) => (
          <g key={i}>
            {/* Zona hover invisible */}
            <rect
              x={(p.x - (innerW / datos.length) / 2).toFixed(1)}
              y={PAD.top}
              width={(innerW / datos.length).toFixed(1)}
              height={innerH}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              style={{ cursor: 'default' }}
            />
            {/* Línea vertical hover */}
            {hover === i && (
              <line
                x1={p.x.toFixed(1)} y1={PAD.top}
                x2={p.x.toFixed(1)} y2={(PAD.top + innerH).toFixed(1)}
                stroke="var(--primary)" strokeOpacity="0.25" strokeWidth="1" strokeDasharray="3 3"
              />
            )}
            {/* Punto */}
            {p.valor > 0 && (
              <>
                <circle cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r="4"
                  fill="white" stroke="var(--primary)" strokeWidth="2"
                  opacity={hover === i ? 1 : 0.6}
                />
                {/* Tooltip */}
                {hover === i && (
                  <g>
                    <rect
                      x={(p.x - 42).toFixed(1)} y={(p.y - 34).toFixed(1)}
                      width="84" height="26" rx="6"
                      fill="#111827"
                    />
                    <text
                      x={p.x.toFixed(1)} y={(p.y - 17).toFixed(1)}
                      textAnchor="middle" fontSize="11" fontWeight="700" fill="white"
                    >
                      {simbolo}{Number(p.valor).toFixed(2)}
                    </text>
                  </g>
                )}
              </>
            )}
            {/* Etiqueta X */}
            {i % step === 0 && (
              <text
                x={p.x.toFixed(1)} y={(H - 6).toFixed(1)}
                textAnchor="middle" fontSize="9" fill="currentColor" fillOpacity="0.45"
              >
                {p.label}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  )
}

// ─── Badge de comparación ────────────────────────────────────────────────────

function BadgeComparacion({ actual, anterior }: { actual: number; anterior: number }) {
  if (anterior === 0) return null
  const pct = ((actual - anterior) / anterior) * 100
  const subida = pct >= 0
  return (
    <span className={cn(
      'inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full',
      subida ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
    )}>
      {subida
        ? <TrendingUp className="w-2.5 h-2.5" />
        : <TrendingDown className="w-2.5 h-2.5" />
      }
      {subida ? '+' : ''}{pct.toFixed(1)}%
    </span>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function IngresosCliente({
  pedidos, desde, hasta, simboloMoneda, totalAnterior, pedidosAntCount,
}: Props) {
  const router = useRouter()
  const [fechaDesde, setFechaDesde] = useState(desde)
  const [fechaHasta, setFechaHasta] = useState(hasta)

  function aplicarFiltro() {
    router.push(`/admin/dashboard/ingresos?desde=${fechaDesde}&hasta=${fechaHasta}`)
  }

  // ── Métricas ──────────────────────────────────────────────────────────────
  const totalIngresos  = pedidos.reduce((s, p) => s + Number(p.total ?? 0), 0)
  const totalPedidos   = pedidos.length
  const ticketPromedio = totalPedidos > 0 ? totalIngresos / totalPedidos : 0
  const ticketAnt      = pedidosAntCount > 0 ? totalAnterior / pedidosAntCount : 0

  // ── Desglose canal ────────────────────────────────────────────────────────
  const porCanal = pedidos.reduce<Record<'online' | 'pos', { monto: number; cant: number }>>(
    (acc, p) => {
      const c: 'online' | 'pos' = p.es_venta_manual ? 'pos' : 'online'
      acc[c].monto += Number(p.total ?? 0)
      acc[c].cant  += 1
      return acc
    },
    { online: { monto: 0, cant: 0 }, pos: { monto: 0, cant: 0 } }
  )

  // ── Desglose forma de pago ────────────────────────────────────────────────
  const porPago = pedidos.reduce<Record<string, { monto: number; cant: number }>>((acc, p) => {
    const key = p.forma_pago ?? 'sin_dato'
    if (!acc[key]) acc[key] = { monto: 0, cant: 0 }
    acc[key].monto += Number(p.total ?? 0)
    acc[key].cant  += 1
    return acc
  }, {})

  // ── Top 5 productos ───────────────────────────────────────────────────────
  const topProductos: Record<string, { cantidad: number; monto: number }> = {}
  pedidos.forEach(p => {
    ;(p.items ?? []).forEach((item) => {
      const nombre = item.nombre ?? 'Desconocido'
      if (!topProductos[nombre]) topProductos[nombre] = { cantidad: 0, monto: 0 }
      topProductos[nombre].cantidad += Number(item.cantidad ?? 1)
      topProductos[nombre].monto   += Number(item.subtotal ?? 0)
    })
  })
  const top5 = Object.entries(topProductos)
    .sort((a, b) => b[1].monto - a[1].monto)
    .slice(0, 5)

  // ── Datos para gráfico con agrupación inteligente ─────────────────────────
  const start    = new Date(desde + 'T00:00:00')
  const end      = new Date(hasta + 'T00:00:00')
  const diffDias = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1

  type Modo = 'diario' | 'semanal' | 'mensual'
  const modo: Modo = diffDias <= 31 ? 'diario' : diffDias <= 91 ? 'semanal' : 'mensual'

  // Agrupar pedidos según modo
  function claveAgrupacion(fecha: string): string {
    const d = new Date(fecha)
    if (modo === 'diario')  return fecha.slice(0, 10)
    if (modo === 'semanal') {
      // Lunes de esa semana
      const lun = new Date(d)
      lun.setDate(d.getDate() - ((d.getDay() + 6) % 7))
      return lun.toISOString().slice(0, 10)
    }
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  }

  function formatLabel(clave: string): string {
    if (modo === 'diario') {
      const d = new Date(clave + 'T12:00:00')
      return d.toLocaleDateString('es-EC', { day: '2-digit', month: 'short' })
    }
    if (modo === 'semanal') {
      const d = new Date(clave + 'T12:00:00')
      return d.toLocaleDateString('es-EC', { day: '2-digit', month: 'short' })
    }
    const [y, m] = clave.split('-')
    return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('es-EC', { month: 'short', year: '2-digit' })
  }

  // Construir todas las claves del rango
  const clavesRango: string[] = []
  const cursor = new Date(start)
  while (cursor <= end) {
    const clave = claveAgrupacion(cursor.toISOString())
    if (!clavesRango.includes(clave)) clavesRango.push(clave)
    if (modo === 'diario')  cursor.setDate(cursor.getDate() + 1)
    else if (modo === 'semanal') cursor.setDate(cursor.getDate() + 7)
    else cursor.setMonth(cursor.getMonth() + 1)
  }

  const porClave: Record<string, number> = {}
  pedidos.forEach(p => {
    const k = claveAgrupacion(p.creado_en)
    porClave[k] = (porClave[k] ?? 0) + Number(p.total ?? 0)
  })

  const datoGrafico = clavesRango.map(k => ({
    label: formatLabel(k),
    valor: porClave[k] ?? 0,
  }))

  const hayFormasPago = pedidos.some(p => p.forma_pago)
  const modoLabel = { diario: 'día', semanal: 'semana', mensual: 'mes' }[modo]

  return (
    <div className="flex flex-col gap-5">

      {/* ── Filtro de fechas ─────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-card border border-card-border p-4 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
          <label className="text-[11px] font-semibold text-foreground-muted">Desde</label>
          <input
            type="date" value={fechaDesde}
            onChange={e => setFechaDesde(e.target.value)}
            className="h-10 px-3 rounded-xl border border-input-border text-sm bg-input-bg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
          <label className="text-[11px] font-semibold text-foreground-muted">Hasta</label>
          <input
            type="date" value={fechaHasta}
            onChange={e => setFechaHasta(e.target.value)}
            className="h-10 px-3 rounded-xl border border-input-border text-sm bg-input-bg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <button
          onClick={aplicarFiltro}
          className="h-10 px-4 rounded-xl bg-primary text-white text-sm font-semibold flex items-center gap-2 hover:bg-primary/90 transition-all flex-shrink-0"
        >
          <Search className="w-4 h-4" />
          Filtrar
        </button>

        {/* Accesos rápidos */}
        <div className="w-full flex gap-2 flex-wrap">
          {[
            {
              label: 'Hoy',
              fn: () => {
                const h = new Date().toISOString().slice(0, 10)
                setFechaDesde(h); setFechaHasta(h)
              },
            },
            {
              label: 'Esta semana',
              fn: () => {
                const now = new Date()
                const lun = new Date(now)
                lun.setDate(now.getDate() - ((now.getDay() + 6) % 7))
                setFechaDesde(lun.toISOString().slice(0, 10))
                setFechaHasta(now.toISOString().slice(0, 10))
              },
            },
            {
              label: 'Este mes',
              fn: () => {
                const now = new Date()
                setFechaDesde(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10))
                setFechaHasta(new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10))
              },
            },
            {
              label: 'Mes pasado',
              fn: () => {
                const now = new Date()
                setFechaDesde(new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10))
                setFechaHasta(new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10))
              },
            },
            {
              label: 'Este año',
              fn: () => {
                const now = new Date()
                setFechaDesde(new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10))
                setFechaHasta(new Date(now.getFullYear(), 11, 31).toISOString().slice(0, 10))
              },
            },
          ].map(({ label, fn }) => (
            <button
              key={label}
              onClick={() => { fn(); setTimeout(aplicarFiltro, 0) }}
              className="text-xs px-3 py-1 rounded-lg border border-border text-foreground-muted hover:border-primary hover:text-primary transition-all"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tarjetas de resumen ──────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl bg-card border border-card-border p-4 flex flex-col gap-1">
          <div className="w-8 h-8 rounded-xl bg-success/10 flex items-center justify-center mb-2">
            <DollarSign className="w-4 h-4 text-success" />
          </div>
          <div className="flex items-end gap-2 flex-wrap">
            <p className="text-xl font-bold text-foreground leading-tight">
              {formatearPrecio(totalIngresos, simboloMoneda)}
            </p>
            <BadgeComparacion actual={totalIngresos} anterior={totalAnterior} />
          </div>
          <p className="text-[11px] text-foreground-muted">Total ingresos</p>
        </div>

        <div className="rounded-2xl bg-card border border-card-border p-4 flex flex-col gap-1">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
            <ClipboardList className="w-4 h-4 text-primary" />
          </div>
          <div className="flex items-end gap-2 flex-wrap">
            <p className="text-2xl font-bold text-foreground">{totalPedidos}</p>
            <BadgeComparacion actual={totalPedidos} anterior={pedidosAntCount} />
          </div>
          <p className="text-[11px] text-foreground-muted">Pedidos confirmados</p>
        </div>

        <div className="rounded-2xl bg-card border border-card-border p-4 flex flex-col gap-1">
          <div className="w-8 h-8 rounded-xl bg-violet-500/10 flex items-center justify-center mb-2">
            <TrendingUp className="w-4 h-4 text-violet-500" />
          </div>
          <div className="flex items-end gap-2 flex-wrap">
            <p className="text-xl font-bold text-foreground leading-tight">
              {formatearPrecio(ticketPromedio, simboloMoneda)}
            </p>
            <BadgeComparacion actual={ticketPromedio} anterior={ticketAnt} />
          </div>
          <p className="text-[11px] text-foreground-muted">Ticket promedio</p>
        </div>
      </div>

      {/* ── Gráfico de área ──────────────────────────────────────────────── */}
      {totalPedidos > 0 && (
        <div className="rounded-2xl bg-card border border-card-border p-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-foreground">
              Ingresos por {modoLabel}
            </p>
            <span className="text-[10px] text-foreground-muted px-2 py-0.5 rounded-full bg-background-subtle border border-border capitalize">
              {modo}
            </span>
          </div>
          <GraficoArea datos={datoGrafico} simbolo={simboloMoneda} />
        </div>
      )}

      {/* ── Top 5 productos ──────────────────────────────────────────────── */}
      {top5.length > 0 && (
        <div className="rounded-2xl bg-card border border-card-border p-4 flex flex-col gap-3">
          <p className="text-xs font-bold text-foreground-muted uppercase tracking-wide">
            Top productos del período
          </p>
          <div className="flex flex-col gap-3">
            {top5.map(([nombre, data], i) => {
              const pct = totalIngresos > 0 ? (data.monto / totalIngresos) * 100 : 0
              return (
                <div key={nombre} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-[10px] font-bold text-primary">{i + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-foreground truncate max-w-[160px]">{nombre}</span>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[10px] text-foreground-muted flex items-center gap-0.5">
                          <Package className="w-2.5 h-2.5" />{data.cantidad}
                        </span>
                        <span className="text-xs font-semibold text-foreground">
                          {formatearPrecio(data.monto, simboloMoneda)}
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-background-subtle overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary/60 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Canal de venta ───────────────────────────────────────────────── */}
      {totalPedidos > 0 && (
        <div className="rounded-2xl bg-card border border-card-border p-4 flex flex-col gap-3">
          <p className="text-xs font-bold text-foreground-muted uppercase tracking-wide">Canal de venta</p>
          <div className="grid grid-cols-2 gap-3">
            {([
              { key: 'online' as const, label: 'Tienda online', icon: <Globe className="w-4 h-4 text-blue-500" />, color: 'bg-blue-500/10' },
              { key: 'pos' as const,    label: 'POS / Manual',  icon: <Receipt className="w-4 h-4 text-orange-500" />, color: 'bg-orange-500/10' },
            ]).map(({ key, label, icon, color }) => (
              <div key={key} className="flex items-center gap-3 p-3 rounded-xl bg-background-subtle border border-border">
                <div className={cn('w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0', color)}>
                  {icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground">{label}</p>
                  <p className="text-[11px] text-foreground-muted">{porCanal[key].cant} pedido{porCanal[key].cant !== 1 ? 's' : ''}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-foreground">{formatearPrecio(porCanal[key].monto, simboloMoneda)}</p>
                  {totalIngresos > 0 && (
                    <p className="text-[10px] text-foreground-muted">{Math.round(porCanal[key].monto / totalIngresos * 100)}%</p>
                  )}
                </div>
              </div>
            ))}
          </div>
          {totalIngresos > 0 && (
            <div className="flex h-1.5 rounded-full overflow-hidden gap-px">
              <div className="bg-blue-500 rounded-l-full" style={{ width: `${porCanal.online.monto / totalIngresos * 100}%` }} />
              <div className="bg-orange-400 flex-1 rounded-r-full" />
            </div>
          )}
        </div>
      )}

      {/* ── Forma de pago ────────────────────────────────────────────────── */}
      {hayFormasPago && (
        <div className="rounded-2xl bg-card border border-card-border p-4 flex flex-col gap-3">
          <p className="text-xs font-bold text-foreground-muted uppercase tracking-wide">Forma de pago</p>
          <div className="flex flex-col gap-2">
            {(['efectivo', 'transferencia', 'tarjeta', 'paypal', 'payphone', 'otro', 'sin_dato'] as const)
              .filter(k => (porPago[k]?.cant ?? 0) > 0)
              .map(key => {
                const item = porPago[key]
                const pct  = totalIngresos > 0 ? item.monto / totalIngresos * 100 : 0
                const iconos: Record<string, React.ReactNode> = {
                  efectivo:      <Banknote className="w-3.5 h-3.5 text-success" />,
                  transferencia: <ArrowLeftRight className="w-3.5 h-3.5 text-blue-500" />,
                  tarjeta:       <CreditCard className="w-3.5 h-3.5 text-violet-500" />,
                  paypal:        <Globe className="w-3.5 h-3.5 text-[#0070ba]" />,
                  payphone:      <CreditCard className="w-3.5 h-3.5 text-orange-500" />,
                  otro:          <MoreHorizontal className="w-3.5 h-3.5 text-foreground-muted" />,
                  sin_dato:      <Globe className="w-3.5 h-3.5 text-blue-400" />,
                }
                const colores: Record<string, string> = {
                  efectivo: 'bg-success', transferencia: 'bg-blue-500',
                  tarjeta: 'bg-violet-500', paypal: 'bg-[#0070ba]',
                  payphone: 'bg-orange-500', otro: 'bg-foreground-muted', sin_dato: 'bg-blue-400',
                }
                const label = key === 'sin_dato' ? 'Online (sin método)' : (ETIQUETAS_PAGO[key] ?? key)
                return (
                  <div key={key} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-lg bg-background-subtle flex items-center justify-center flex-shrink-0">
                      {iconos[key]}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-foreground">{label}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-foreground-muted">{item.cant} pedido{item.cant !== 1 ? 's' : ''}</span>
                          <span className="text-xs font-semibold text-foreground">{formatearPrecio(item.monto, simboloMoneda)}</span>
                          <span className="text-[10px] text-foreground-muted w-8 text-right">{Math.round(pct)}%</span>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full bg-background-subtle overflow-hidden">
                        <div className={cn('h-full rounded-full', colores[key])} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      )}

      {/* ── Tabla de pedidos ─────────────────────────────────────────────── */}
      {pedidos.length === 0 ? (
        <div className="rounded-2xl bg-card border border-card-border p-8 text-center text-foreground-muted text-sm">
          No hay ingresos en el período seleccionado
        </div>
      ) : (
        <div className="rounded-2xl bg-card border border-card-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Detalle de pedidos</p>
            <Link
              href="/admin/dashboard/pedidos"
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              Ir a pedidos <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="flex flex-col divide-y divide-border">
            {pedidos.map(p => (
              <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-foreground font-mono">#{p.numero_orden}</span>
                    <span className={cn(
                      'text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
                      COLORES_ESTADO[p.estado] ?? 'bg-card text-foreground-muted'
                    )}>
                      {ETIQUETAS_ESTADO[p.estado] ?? p.estado}
                    </span>
                    {p.es_venta_manual && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-orange-500/10 text-orange-600 flex items-center gap-0.5">
                        <Receipt className="w-2.5 h-2.5" /> POS
                      </span>
                    )}
                    {p.forma_pago && (
                      <span className="text-[10px] text-foreground-muted px-1.5 py-0.5 rounded-full bg-background-subtle capitalize">
                        {ETIQUETAS_PAGO[p.forma_pago] ?? p.forma_pago}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-foreground-muted mt-0.5 truncate">{p.nombres}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-foreground">{formatearPrecio(Number(p.total), simboloMoneda)}</p>
                  <p className="text-[10px] text-foreground-muted">
                    {new Date(p.creado_en).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="px-4 py-3 border-t border-border bg-background-subtle flex items-center justify-between">
            <p className="text-xs font-semibold text-foreground">{totalPedidos} pedido{totalPedidos !== 1 ? 's' : ''}</p>
            <p className="text-sm font-bold text-success">{formatearPrecio(totalIngresos, simboloMoneda)}</p>
          </div>
        </div>
      )}
    </div>
  )
}
