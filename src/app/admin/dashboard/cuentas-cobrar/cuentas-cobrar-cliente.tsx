'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { PedidoCC, CuotaCC } from './page'
import { AlertTriangle, CheckCircle2, Clock, TrendingDown, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  pedidos: PedidoCC[]
  simboloMoneda: string
}

type Filtro = 'todos' | 'vencido' | 'por-vencer' | 'al-dia'

function fmt(n: number, s: string) {
  return `${s}${n.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function estadoCuotasMasGrave(cuotas: CuotaCC[]): 'vencido' | 'por-vencer' | 'al-dia' {
  const pendientes = cuotas.filter(c => c.estado !== 'pagado')
  if (pendientes.some(c => c.estado === 'vencido')) return 'vencido'
  const hoy = new Date()
  const en7dias = new Date(hoy)
  en7dias.setDate(hoy.getDate() + 7)
  if (pendientes.some(c => new Date(c.fecha_vencimiento) <= en7dias)) return 'por-vencer'
  return 'al-dia'
}

function BadgeEstado({ estado }: { estado: 'vencido' | 'por-vencer' | 'al-dia' }) {
  if (estado === 'vencido') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-danger/10 text-danger">
      <AlertTriangle className="w-2.5 h-2.5" /> Vencido
    </span>
  )
  if (estado === 'por-vencer') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-warning/10 text-warning">
      <Clock className="w-2.5 h-2.5" /> Por vencer
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-success/10 text-success">
      <CheckCircle2 className="w-2.5 h-2.5" /> Al día
    </span>
  )
}

export function CuentasCobrarCliente({ pedidos, simboloMoneda }: Props) {
  const [filtro, setFiltro] = useState<Filtro>('todos')

  const hoy = new Date()
  const en7dias = new Date(hoy)
  en7dias.setDate(hoy.getDate() + 7)

  const resumen = useMemo(() => {
    let totalPorCobrar = 0
    let totalVencido = 0
    let totalPorVencer = 0
    let cuentasActivas = pedidos.length

    for (const p of pedidos) {
      totalPorCobrar += p.credito_saldo_pendiente
      for (const c of p.cuotas_credito) {
        if (c.estado === 'pagado') continue
        if (c.estado === 'vencido') totalVencido += c.monto
        else if (new Date(c.fecha_vencimiento) <= en7dias) totalPorVencer += c.monto
      }
    }
    return { totalPorCobrar, totalVencido, totalPorVencer, cuentasActivas }
  }, [pedidos])

  const pedidosFiltrados = useMemo(() => {
    if (filtro === 'todos') return pedidos
    return pedidos.filter(p => {
      const estado = estadoCuotasMasGrave(p.cuotas_credito)
      if (filtro === 'vencido') return estado === 'vencido'
      if (filtro === 'por-vencer') return estado === 'por-vencer'
      if (filtro === 'al-dia') return estado === 'al-dia'
      return true
    })
  }, [pedidos, filtro])

  const frecuenciaLabel: Record<string, string> = {
    mensual: 'Mensual', quincenal: 'Quincenal', semanal: 'Semanal',
  }

  const tabs: { key: Filtro; label: string }[] = [
    { key: 'todos', label: `Todos (${pedidos.length})` },
    { key: 'vencido', label: 'Vencido' },
    { key: 'por-vencer', label: 'Por vencer' },
    { key: 'al-dia', label: 'Al día' },
  ]

  return (
    <div className="flex flex-col gap-4">
      {/* Tarjetas resumen */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-foreground-muted">Total por cobrar</p>
          <p className="text-xl font-bold text-foreground mt-1">{fmt(resumen.totalPorCobrar, simboloMoneda)}</p>
          <p className="text-[10px] text-foreground-muted mt-0.5">{resumen.cuentasActivas} cuenta{resumen.cuentasActivas !== 1 ? 's' : ''} activa{resumen.cuentasActivas !== 1 ? 's' : ''}</p>
        </div>
        <div className="bg-card border border-danger/20 rounded-xl p-4">
          <div className="flex items-center gap-1.5 text-danger mb-1">
            <TrendingDown className="w-3.5 h-3.5" />
            <p className="text-xs font-medium">Vencido</p>
          </div>
          <p className="text-xl font-bold text-danger">{fmt(resumen.totalVencido, simboloMoneda)}</p>
          <p className="text-[10px] text-foreground-muted mt-0.5">Cuotas no pagadas</p>
        </div>
        <div className="bg-card border border-warning/20 rounded-xl p-4">
          <div className="flex items-center gap-1.5 text-warning mb-1">
            <Clock className="w-3.5 h-3.5" />
            <p className="text-xs font-medium">Vence en 7 días</p>
          </div>
          <p className="text-xl font-bold text-warning">{fmt(resumen.totalPorVencer, simboloMoneda)}</p>
          <p className="text-[10px] text-foreground-muted mt-0.5">Próximos vencimientos</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-1.5 text-foreground-muted mb-1">
            <Users className="w-3.5 h-3.5" />
            <p className="text-xs font-medium">Cuentas</p>
          </div>
          <p className="text-xl font-bold text-foreground">{resumen.cuentasActivas}</p>
          <p className="text-[10px] text-foreground-muted mt-0.5">Con saldo pendiente</p>
        </div>
      </div>

      {/* Tabs filtro */}
      <div className="flex gap-1 border-b border-border">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setFiltro(t.key)}
            className={cn(
              'px-3 py-2 text-xs font-medium border-b-2 transition-colors -mb-px',
              filtro === t.key
                ? 'border-primary text-primary'
                : 'border-transparent text-foreground-muted hover:text-foreground'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tabla */}
      {pedidosFiltrados.length === 0 ? (
        <div className="text-center py-12 text-foreground-muted">
          <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No hay cuentas en este estado</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-background-subtle border-b border-border">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-foreground-muted">Cliente</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-foreground-muted">Pedido</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-foreground-muted">Total crédito</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-foreground-muted">Saldo</th>
                  <th className="text-center px-4 py-2.5 text-xs font-semibold text-foreground-muted">Cuotas</th>
                  <th className="text-center px-4 py-2.5 text-xs font-semibold text-foreground-muted">Estado</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pedidosFiltrados.map(p => {
                  const estado = estadoCuotasMasGrave(p.cuotas_credito)
                  const pagadas = p.cuotas_credito.filter(c => c.estado === 'pagado').length
                  return (
                    <tr key={p.id} className="hover:bg-background-subtle transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground text-xs">{p.nombres}</p>
                        <p className="text-[10px] text-foreground-muted">{frecuenciaLabel[p.credito_frecuencia] ?? p.credito_frecuencia}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-foreground-muted">{p.numero_orden}</td>
                      <td className="px-4 py-3 text-right text-xs font-mono">{fmt(p.credito_total, simboloMoneda)}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-xs font-bold font-mono text-danger">{fmt(p.credito_saldo_pendiente, simboloMoneda)}</span>
                      </td>
                      <td className="px-4 py-3 text-center text-xs text-foreground-muted">
                        {pagadas}/{p.credito_cuotas}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <BadgeEstado estado={estado} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/admin/dashboard/cuentas-cobrar/${p.id}`}
                          className="text-xs text-primary hover:underline font-medium"
                        >
                          Ver →
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
