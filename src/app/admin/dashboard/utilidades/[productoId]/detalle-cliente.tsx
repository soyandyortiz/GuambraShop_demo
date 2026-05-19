'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, TrendingUp, TrendingDown } from 'lucide-react'
import Link from 'next/link'
import { formatearPrecio } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { VentaProducto } from './page'

interface Producto {
  id: string
  nombre: string
  precio: number
  precio_costo: number | null
}

interface Props {
  producto: Producto
  ventas: VentaProducto[]
  desde: string
  hasta: string
  simboloMoneda: string
}

function Tarjeta({ titulo, valor, sub, color }: { titulo: string; valor: string; sub?: string; color?: string }) {
  return (
    <div className="bg-card rounded-2xl border border-border p-4 flex flex-col gap-1">
      <p className="text-xs text-foreground-muted font-medium">{titulo}</p>
      <p className={cn('text-xl font-bold', color ?? 'text-foreground')}>{valor}</p>
      {sub && <p className="text-[11px] text-foreground-muted">{sub}</p>}
    </div>
  )
}

export function DetalleCliente({ producto, ventas, desde, hasta, simboloMoneda }: Props) {
  const router = useRouter()
  const [fechaDesde, setFechaDesde] = useState(desde)
  const [fechaHasta, setFechaHasta] = useState(hasta)

  const fp = (n: number) => formatearPrecio(n, simboloMoneda)

  function aplicarFiltro() {
    router.push(`/admin/dashboard/utilidades/${producto.id}?desde=${fechaDesde}&hasta=${fechaHasta}`)
  }

  // ── Métricas ──────────────────────────────────────────────────────────────
  const totalUnidades  = ventas.reduce((s, v) => s + Number(v.cantidad      ?? 0), 0)
  const totalIngresos  = ventas.reduce((s, v) => s + (Number(v.precio_vendido ?? 0) * Number(v.cantidad ?? 0)), 0)
  const totalUtilidad  = ventas.reduce((s, v) => s + Number(v.utilidad      ?? 0), 0)
  const margenGlobal   = totalIngresos > 0 ? (totalUtilidad / totalIngresos) * 100 : 0

  // ── Formato de fecha ──────────────────────────────────────────────────────
  function formatFecha(f: string) {
    return new Date(f + 'T12:00:00').toLocaleDateString('es-EC', {
      day: '2-digit', month: 'short', year: 'numeric',
    })
  }

  return (
    <div className="flex flex-col gap-5">

      {/* ── Cabecera ── */}
      <div className="flex items-start gap-3">
        <Link
          href={`/admin/dashboard/utilidades?desde=${desde}&hasta=${hasta}`}
          className="mt-1 p-2 rounded-xl hover:bg-background-subtle transition-colors text-foreground-muted hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-foreground leading-tight">{producto.nombre}</h1>
          <div className="flex flex-wrap items-center gap-3 mt-1">
            <span className="text-xs text-foreground-muted">
              Precio de venta base: <strong className="text-foreground">{fp(producto.precio)}</strong>
            </span>
            <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full font-medium">
              Costo: {fp(producto.precio_costo ?? 0)}
            </span>
          </div>
        </div>
      </div>

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

      {/* ── Tarjetas ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Tarjeta titulo="Ventas" valor={`${ventas.length}`} sub={`${totalUnidades} unidades totales`} />
        <Tarjeta titulo="Ingresos" valor={fp(totalIngresos)} sub="Suma de todos los precios reales" />
        <Tarjeta
          titulo="Utilidad total"
          valor={fp(totalUtilidad)}
          color={totalUtilidad >= 0 ? 'text-emerald-600' : 'text-red-600'}
          sub="Ingresos − Costo acumulado"
        />
        <Tarjeta
          titulo="Margen"
          valor={`${margenGlobal.toFixed(1)}%`}
          color={margenGlobal < 0 ? 'text-red-600' : margenGlobal < 15 ? 'text-amber-600' : 'text-emerald-600'}
        />
      </div>

      {/* ── Tabla de ventas ── */}
      {ventas.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-8 text-center text-sm text-foreground-muted">
          No hay ventas de este producto en el período seleccionado.
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-sm font-semibold text-foreground">
              Historial de ventas
              <span className="ml-2 text-xs font-normal text-foreground-muted">Ordenado por fecha descendente</span>
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-background-subtle border-b border-border">
                <tr>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-foreground-muted whitespace-nowrap">Fecha</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-foreground-muted whitespace-nowrap">N° Pedido</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-foreground-muted">Cliente</th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold text-foreground-muted whitespace-nowrap">Precio vendido</th>
                  <th className="px-3 py-2.5 text-center text-xs font-semibold text-foreground-muted">Cant.</th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold text-foreground-muted whitespace-nowrap">Costo unit.</th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold text-foreground-muted whitespace-nowrap">Utilidad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {ventas.map((v, i) => {
                  const utilPorUnidad = v.precio_vendido - v.costo_unitario
                  return (
                    <tr
                      key={`${v.pedido_id}-${i}`}
                      className={cn(
                        'transition-colors hover:bg-background-subtle',
                        v.utilidad < 0 && 'bg-red-50/40 hover:bg-red-50'
                      )}
                    >
                      <td className="px-3 py-3 text-foreground-muted whitespace-nowrap text-xs">{formatFecha(v.fecha)}</td>
                      <td className="px-3 py-3">
                        <Link
                          href={`/admin/dashboard/pedidos?q=${v.numero_orden}`}
                          className="font-mono text-xs text-primary hover:underline"
                          onClick={e => e.stopPropagation()}
                        >
                          {v.numero_orden}
                        </Link>
                      </td>
                      <td className="px-3 py-3 text-foreground max-w-[150px] truncate">{v.cliente}</td>
                      <td className="px-3 py-3 text-right font-medium text-foreground whitespace-nowrap">
                        <span>{fp(v.precio_vendido)}</span>
                        {Math.abs(v.precio_vendido - producto.precio) > 0.01 && (
                          <span className="ml-1.5 text-[10px] text-amber-600 font-semibold">
                            {v.precio_vendido < producto.precio ? '↓' : '↑'}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center text-foreground-muted">{v.cantidad}</td>
                      <td className="px-3 py-3 text-right text-foreground-muted text-xs whitespace-nowrap">{fp(v.costo_unitario)}</td>
                      <td className={cn('px-3 py-3 text-right font-bold whitespace-nowrap', v.utilidad < 0 ? 'text-red-600' : 'text-emerald-700')}>
                        <span>{fp(v.utilidad)}</span>
                        <span className={cn('ml-1 text-[10px] font-normal', v.utilidad < 0 ? 'text-red-400' : 'text-emerald-500')}>
                          ({fp(utilPorUnidad)}/u)
                        </span>
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
                  <td className="px-3 py-3 text-center font-bold text-foreground">{totalUnidades}</td>
                  <td />
                  <td className={cn('px-3 py-3 text-right font-bold', totalUtilidad < 0 ? 'text-red-600' : 'text-emerald-700')}>
                    <span className="flex items-center justify-end gap-1 whitespace-nowrap">
                      {totalUtilidad < 0
                        ? <TrendingDown className="w-3.5 h-3.5" />
                        : <TrendingUp className="w-3.5 h-3.5" />
                      }
                      {fp(totalUtilidad)}
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

    </div>
  )
}
