'use client'

import { TrendingUp, TrendingDown } from 'lucide-react'
import { cn, formatearPrecio } from '@/lib/utils'
import { GraficoArea } from '@/components/admin/grafico-area'

interface Props {
  datos: { etiqueta: string; valor: number }[]
  totalAnterior?: number
  simboloMoneda?: string
  titulo?: string
  subtitulo?: string
}

export function GraficoVentasPremium({
  datos,
  totalAnterior = 0,
  simboloMoneda = '$',
  titulo,
  subtitulo,
}: Props) {
  const totalActual = datos.reduce((s, d) => s + d.valor, 0)
  const pct = totalAnterior === 0
    ? null
    : ((totalActual - totalAnterior) / totalAnterior) * 100
  const subida = pct !== null && pct >= 0

  // Adaptar formato al esperado por GraficoArea
  const datosAdaptados = datos.map(d => ({ label: d.etiqueta, valor: d.valor }))

  return (
    <div className="bg-card border border-card-border rounded-3xl p-6 shadow-sm overflow-hidden relative">
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

      <div className="flex items-start justify-between mb-5 relative z-10">
        <div>
          <h3 className="text-[10px] font-black text-foreground-muted uppercase tracking-widest flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5 text-primary" />
            {titulo ?? 'Ingresos Diarios'}
          </h3>
          <p className="text-2xl font-black text-foreground mt-1">{formatearPrecio(totalActual)}</p>
          <p className="text-xs text-foreground-muted font-medium">{subtitulo ?? 'Últimos 28 días'}</p>
        </div>

        {pct !== null && (
          <span className={cn(
            'inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black border',
            subida
              ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
              : 'bg-red-50 text-red-600 border-red-100'
          )}>
            {subida ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {subida ? '+' : ''}{pct.toFixed(1)}% vs período anterior
          </span>
        )}
      </div>

      <GraficoArea datos={datosAdaptados} simbolo={simboloMoneda} />
    </div>
  )
}
