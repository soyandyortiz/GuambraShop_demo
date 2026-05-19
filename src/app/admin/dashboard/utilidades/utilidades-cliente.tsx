'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  TrendingUp, TrendingDown, AlertCircle, ChevronDown, ChevronUp,
  ArrowUpDown, ArrowRight, ExternalLink,
} from 'lucide-react'
import Link from 'next/link'
import { formatearPrecio } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { FilaUtilidad } from './page'

interface Props {
  filas: FilaUtilidad[]
  sinCosto: { id: string; nombre: string }[]
  desde: string
  hasta: string
  simboloMoneda: string
}

type ColOrden = 'nombre' | 'total_unidades' | 'total_ingresos' | 'utilidad_total' | 'margen'

// ─── Tarjeta de métrica ───────────────────────────────────────────────────────

function Tarjeta({ titulo, valor, sub, color }: { titulo: string; valor: string; sub?: string; color?: string }) {
  return (
    <div className="bg-card rounded-2xl border border-border p-4 flex flex-col gap-1">
      <p className="text-xs text-foreground-muted font-medium">{titulo}</p>
      <p className={cn('text-2xl font-bold', color ?? 'text-foreground')}>{valor}</p>
      {sub && <p className="text-[11px] text-foreground-muted">{sub}</p>}
    </div>
  )
}

// ─── Indicador de margen ──────────────────────────────────────────────────────

function BadgeMargen({ margen }: { margen: number }) {
  const color =
    margen < 0   ? 'bg-red-100 text-red-700' :
    margen < 15  ? 'bg-amber-100 text-amber-700' :
    margen < 30  ? 'bg-emerald-50 text-emerald-700' :
                   'bg-emerald-100 text-emerald-800'
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap', color)}>
      {margen < 0 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
      {margen.toFixed(1)}%
    </span>
  )
}

// ─── Cabecera de columna ordenable ────────────────────────────────────────────

function Th({
  col, actual, dir, onClick, children, className,
}: {
  col: ColOrden; actual: ColOrden; dir: 'asc' | 'desc'
  onClick: (c: ColOrden) => void; children: React.ReactNode; className?: string
}) {
  const activo = col === actual
  return (
    <th
      onClick={() => onClick(col)}
      className={cn(
        'px-3 py-2.5 text-left text-xs font-semibold text-foreground-muted cursor-pointer select-none whitespace-nowrap hover:text-foreground transition-colors',
        activo && 'text-foreground',
        className
      )}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {activo
          ? (dir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)
          : <ArrowUpDown className="w-3 h-3 opacity-40" />
        }
      </span>
    </th>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function UtilidadesCliente({ filas, sinCosto, desde, hasta, simboloMoneda }: Props) {
  const router = useRouter()
  const [fechaDesde, setFechaDesde] = useState(desde)
  const [fechaHasta, setFechaHasta] = useState(hasta)
  const [orden, setOrden] = useState<{ col: ColOrden; dir: 'asc' | 'desc' }>({ col: 'utilidad_total', dir: 'desc' })
  const [mostrarSinCosto, setMostrarSinCosto] = useState(false)

  function aplicarFiltro() {
    router.push(`/admin/dashboard/utilidades?desde=${fechaDesde}&hasta=${fechaHasta}`)
  }

  function toggleOrden(col: ColOrden) {
    setOrden(prev =>
      prev.col === col
        ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { col, dir: 'desc' }
    )
  }

  // ── Métricas globales ─────────────────────────────────────────────────────
  const totalIngresos  = filas.reduce((s, f) => s + Number(f.total_ingresos  ?? 0), 0)
  const totalCosto     = filas.reduce((s, f) => s + Number(f.total_costo     ?? 0), 0)
  const totalUtilidad  = filas.reduce((s, f) => s + Number(f.utilidad_total  ?? 0), 0)
  const margenGlobal   = totalIngresos > 0 ? (totalUtilidad / totalIngresos) * 100 : 0

  // ── Ordenar filas ─────────────────────────────────────────────────────────
  const filasOrdenadas = [...filas].sort((a, b) => {
    let va = 0, vb = 0
    if (orden.col === 'nombre') {
      return orden.dir === 'asc'
        ? a.nombre.localeCompare(b.nombre)
        : b.nombre.localeCompare(a.nombre)
    }
    if (orden.col === 'total_unidades') { va = a.total_unidades; vb = b.total_unidades }
    if (orden.col === 'total_ingresos') { va = a.total_ingresos; vb = b.total_ingresos }
    if (orden.col === 'utilidad_total') { va = a.utilidad_total; vb = b.utilidad_total }
    if (orden.col === 'margen') {
      va = a.total_ingresos > 0 ? (a.utilidad_total / a.total_ingresos) * 100 : 0
      vb = b.total_ingresos > 0 ? (b.utilidad_total / b.total_ingresos) * 100 : 0
    }
    return orden.dir === 'asc' ? va - vb : vb - va
  })

  const fp = (n: number) => formatearPrecio(n, simboloMoneda)

  return (
    <div className="flex flex-col gap-5">

      {/* ── Filtro de fechas ── */}
      <div className="bg-card rounded-2xl border border-border p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-foreground-muted">Desde</label>
            <input
              type="date"
              value={fechaDesde}
              onChange={e => setFechaDesde(e.target.value)}
              className="h-9 px-3 rounded-xl border border-input-border bg-input-bg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-foreground-muted">Hasta</label>
            <input
              type="date"
              value={fechaHasta}
              onChange={e => setFechaHasta(e.target.value)}
              className="h-9 px-3 rounded-xl border border-input-border bg-input-bg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <button
            onClick={aplicarFiltro}
            className="h-9 px-5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary-hover transition-colors"
          >
            Aplicar
          </button>
        </div>
      </div>

      {/* ── Tarjetas resumen ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Tarjeta titulo="Ingresos totales"  valor={fp(totalIngresos)} sub="Ventas del período" />
        <Tarjeta titulo="Costo total"       valor={fp(totalCosto)}    sub="Costo de mercancía vendida" color="text-foreground-muted" />
        <Tarjeta
          titulo="Utilidad neta"
          valor={fp(totalUtilidad)}
          sub={`${filas.length} producto${filas.length !== 1 ? 's' : ''} con costo registrado`}
          color={totalUtilidad >= 0 ? 'text-emerald-600' : 'text-red-600'}
        />
        <Tarjeta
          titulo="Margen promedio"
          valor={`${margenGlobal.toFixed(1)}%`}
          sub="(Utilidad / Ingresos)"
          color={margenGlobal < 0 ? 'text-red-600' : margenGlobal < 15 ? 'text-amber-600' : 'text-emerald-600'}
        />
      </div>

      {/* ── Tabla dinámica ── */}
      {filas.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-8 text-center text-sm text-foreground-muted">
          No hay ventas con precio de costo registrado en este período.
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-sm font-semibold text-foreground">
              Utilidad por producto
              <span className="ml-2 text-xs font-normal text-foreground-muted">
                Haz clic en una fila para ver el detalle de cada venta
              </span>
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-background-subtle border-b border-border">
                <tr>
                  <Th col="nombre"         actual={orden.col} dir={orden.dir} onClick={toggleOrden}>Producto</Th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-foreground-muted whitespace-nowrap">Costo unit.</th>
                  <Th col="total_unidades" actual={orden.col} dir={orden.dir} onClick={toggleOrden}>Und.</Th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-foreground-muted whitespace-nowrap">Precio venta</th>
                  <Th col="total_ingresos" actual={orden.col} dir={orden.dir} onClick={toggleOrden}>Ingresos</Th>
                  <Th col="utilidad_total" actual={orden.col} dir={orden.dir} onClick={toggleOrden}>Utilidad</Th>
                  <Th col="margen"         actual={orden.col} dir={orden.dir} onClick={toggleOrden}>Margen</Th>
                  <th className="px-3 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filasOrdenadas.map(f => {
                  const margen = f.total_ingresos > 0 ? (f.utilidad_total / f.total_ingresos) * 100 : 0
                  const mismosPrecio = Math.abs(f.precio_min - f.precio_max) < 0.01
                  const rangoPrecios = mismosPrecio
                    ? fp(f.precio_min)
                    : `${fp(f.precio_min)} – ${fp(f.precio_max)}`
                  return (
                    <tr
                      key={f.producto_id}
                      onClick={() => router.push(`/admin/dashboard/utilidades/${f.producto_id}?desde=${desde}&hasta=${hasta}`)}
                      className={cn(
                        'cursor-pointer transition-colors hover:bg-background-subtle',
                        f.utilidad_total < 0 && 'bg-red-50/40 hover:bg-red-50'
                      )}
                    >
                      <td className="px-3 py-3">
                        <p className="font-medium text-foreground truncate max-w-[180px]">{f.nombre}</p>
                      </td>
                      <td className="px-3 py-3 text-foreground-muted whitespace-nowrap">{fp(f.precio_costo)}</td>
                      <td className="px-3 py-3 text-foreground-muted text-center">{f.total_unidades}</td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className="text-foreground-muted">{rangoPrecios}</span>
                        {!mismosPrecio && (
                          <span className="ml-1.5 text-[10px] text-amber-600 font-semibold bg-amber-50 px-1.5 py-0.5 rounded-full">
                            varía
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 font-medium text-foreground whitespace-nowrap">{fp(f.total_ingresos)}</td>
                      <td className={cn('px-3 py-3 font-bold whitespace-nowrap', f.utilidad_total < 0 ? 'text-red-600' : 'text-emerald-700')}>
                        {fp(f.utilidad_total)}
                      </td>
                      <td className="px-3 py-3"><BadgeMargen margen={margen} /></td>
                      <td className="px-3 py-3">
                        <ArrowRight className="w-4 h-4 text-foreground-muted" />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot className="bg-background-subtle border-t-2 border-border">
                <tr>
                  <td colSpan={4} className="px-3 py-3 text-xs font-bold text-foreground-muted uppercase tracking-wide">
                    TOTALES
                  </td>
                  <td className="px-3 py-3 font-bold text-foreground whitespace-nowrap">{fp(totalIngresos)}</td>
                  <td className={cn('px-3 py-3 font-bold whitespace-nowrap', totalUtilidad < 0 ? 'text-red-600' : 'text-emerald-700')}>
                    {fp(totalUtilidad)}
                  </td>
                  <td className="px-3 py-3"><BadgeMargen margen={margenGlobal} /></td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ── Productos sin precio de costo ── */}
      {sinCosto.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl overflow-hidden">
          <button
            onClick={() => setMostrarSinCosto(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-amber-100/50 transition-colors"
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-amber-800">
              <AlertCircle className="w-4 h-4" />
              {sinCosto.length} producto{sinCosto.length !== 1 ? 's' : ''} sin precio de costo — excluidos del cálculo
            </span>
            {mostrarSinCosto ? <ChevronUp className="w-4 h-4 text-amber-700" /> : <ChevronDown className="w-4 h-4 text-amber-700" />}
          </button>
          {mostrarSinCosto && (
            <div className="px-4 pb-4 border-t border-amber-200">
              <p className="text-xs text-amber-700 mt-2 mb-3">
                Completa el precio de costo en cada producto para incluirlos en el análisis de utilidades.
              </p>
              <div className="flex flex-col gap-1">
                {sinCosto.map(p => (
                  <Link
                    key={p.id}
                    href={`/admin/dashboard/productos/${p.id}/editar`}
                    className="flex items-center justify-between px-3 py-2 rounded-xl bg-white border border-amber-100 hover:border-amber-300 transition-all group"
                    onClick={e => e.stopPropagation()}
                  >
                    <span className="text-sm text-foreground">{p.nombre}</span>
                    <span className="flex items-center gap-1 text-xs text-amber-600 font-medium group-hover:text-amber-800">
                      Agregar costo <ExternalLink className="w-3 h-3" />
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  )
}
