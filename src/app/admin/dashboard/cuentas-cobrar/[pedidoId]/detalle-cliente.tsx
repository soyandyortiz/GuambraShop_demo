'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { crearClienteSupabase } from '@/lib/supabase/cliente'
import { PedidoDetalle, CuotaDetalle, AbonoDetalle } from './page'
import { AlertTriangle, CheckCircle2, Clock, ArrowLeft, X, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Props {
  pedido: PedidoDetalle
  cuotas: CuotaDetalle[]
  abonos: AbonoDetalle[]
  simboloMoneda: string
}

function fmt(n: number, s: string) {
  return `${s}${n.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })
}

function BadgeEstado({ estado }: { estado: string }) {
  if (estado === 'vencido') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-danger/10 text-danger">
      <AlertTriangle className="w-2.5 h-2.5" /> Vencido
    </span>
  )
  if (estado === 'pagado') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-success/10 text-success">
      <CheckCircle2 className="w-2.5 h-2.5" /> Pagado
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-warning/10 text-warning">
      <Clock className="w-2.5 h-2.5" /> Pendiente
    </span>
  )
}

export function DetalleCuentaCliente({ pedido, cuotas, abonos, simboloMoneda }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [modalAbierto, setModalAbierto] = useState(false)
  const [cuotaSeleccionada, setCuotaSeleccionada] = useState<CuotaDetalle | null>(null)
  const [monto, setMonto] = useState('')
  const [notas, setNotas] = useState('')
  const [guardando, setGuardando] = useState(false)

  const frecuenciaLabel: Record<string, string> = {
    mensual: 'Mensual', quincenal: 'Quincenal', semanal: 'Semanal',
  }

  const pagadas = cuotas.filter(c => c.estado === 'pagado').length
  const porcentajePagado = pedido.credito_total > 0
    ? ((pedido.credito_total - pedido.credito_saldo_pendiente) / pedido.credito_total) * 100
    : 0

  const totalPagado = pedido.credito_total - pedido.credito_saldo_pendiente

  function abrirModal(cuota: CuotaDetalle) {
    setCuotaSeleccionada(cuota)
    setMonto(cuota.monto.toFixed(2))
    setNotas('')
    setModalAbierto(true)
  }

  async function registrarAbono() {
    if (!cuotaSeleccionada) return
    const montoNum = parseFloat(monto)
    if (isNaN(montoNum) || montoNum <= 0) {
      toast.error('Ingresa un monto válido')
      return
    }

    setGuardando(true)
    const supabase = crearClienteSupabase()

    try {
      const hoy = new Date().toISOString().split('T')[0]

      // 1. Insertar abono
      const { error: errAbono } = await supabase.from('abonos_credito').insert({
        pedido_id: pedido.id,
        cuota_id: cuotaSeleccionada.id,
        monto: montoNum,
        notas: notas.trim() || null,
      })
      if (errAbono) throw errAbono

      // 2. Si el monto >= monto cuota → marcar cuota como pagada
      if (montoNum >= cuotaSeleccionada.monto) {
        const { error: errCuota } = await supabase
          .from('cuotas_credito')
          .update({ estado: 'pagado', fecha_pago: hoy })
          .eq('id', cuotaSeleccionada.id)
        if (errCuota) throw errCuota
      }

      // 3. Decrementar saldo pendiente en pedido
      const nuevoSaldo = Math.max(0, pedido.credito_saldo_pendiente - montoNum)
      const { error: errPedido } = await supabase
        .from('pedidos')
        .update({ credito_saldo_pendiente: nuevoSaldo })
        .eq('id', pedido.id)
      if (errPedido) throw errPedido

      toast.success('Abono registrado')
      setModalAbierto(false)
      startTransition(() => router.refresh())
    } catch (e: any) {
      toast.error(e?.message ?? 'Error al registrar abono')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/admin/dashboard/cuentas-cobrar"
        className="flex items-center gap-1.5 text-xs text-foreground-muted hover:text-foreground w-fit"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Volver a Cuentas por Cobrar
      </Link>

      {/* Resumen del crédito */}
      <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-4">
        <div className="flex flex-wrap gap-6">
          <div>
            <p className="text-[10px] text-foreground-muted uppercase tracking-wide">Total crédito</p>
            <p className="text-2xl font-bold text-foreground">{fmt(pedido.credito_total, simboloMoneda)}</p>
          </div>
          <div>
            <p className="text-[10px] text-foreground-muted uppercase tracking-wide">Ya pagado</p>
            <p className="text-2xl font-bold text-success">{fmt(totalPagado, simboloMoneda)}</p>
          </div>
          <div>
            <p className="text-[10px] text-foreground-muted uppercase tracking-wide">Saldo pendiente</p>
            <p className="text-2xl font-bold text-danger">{fmt(pedido.credito_saldo_pendiente, simboloMoneda)}</p>
          </div>
          <div>
            <p className="text-[10px] text-foreground-muted uppercase tracking-wide">Cuotas</p>
            <p className="text-2xl font-bold text-foreground">{pagadas}/{pedido.credito_cuotas}</p>
          </div>
          <div>
            <p className="text-[10px] text-foreground-muted uppercase tracking-wide">Frecuencia</p>
            <p className="text-lg font-semibold text-foreground">{frecuenciaLabel[pedido.credito_frecuencia] ?? pedido.credito_frecuencia}</p>
          </div>
          {pedido.credito_tasa > 0 && (
            <div>
              <p className="text-[10px] text-foreground-muted uppercase tracking-wide">Tasa mensual</p>
              <p className="text-lg font-semibold text-foreground">{pedido.credito_tasa}%</p>
            </div>
          )}
        </div>

        {/* Barra de progreso */}
        <div>
          <div className="flex justify-between text-[10px] text-foreground-muted mb-1">
            <span>Progreso de pago</span>
            <span>{pagadas} de {pedido.credito_cuotas} cuotas</span>
          </div>
          <div className="h-2 bg-background-subtle rounded-full overflow-hidden">
            <div
              className="h-full bg-success rounded-full transition-all"
              style={{ width: `${(pagadas / pedido.credito_cuotas) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Tabla de cuotas */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Plan de cuotas</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-background-subtle border-b border-border">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-foreground-muted">N°</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-foreground-muted">Vencimiento</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-foreground-muted">Monto</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-foreground-muted">Pagado</th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold text-foreground-muted">Estado</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {cuotas.map(c => (
                <tr key={c.id} className={cn(
                  'transition-colors',
                  c.estado === 'pagado' ? 'bg-success/5' : 'hover:bg-background-subtle'
                )}>
                  <td className="px-4 py-3 text-xs font-mono text-foreground-muted">#{c.numero_cuota}</td>
                  <td className="px-4 py-3 text-xs text-foreground">{fmtFecha(c.fecha_vencimiento)}</td>
                  <td className="px-4 py-3 text-right text-xs font-mono font-medium">{fmt(c.monto, simboloMoneda)}</td>
                  <td className="px-4 py-3 text-xs text-foreground-muted">
                    {c.fecha_pago ? fmtFecha(c.fecha_pago) : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <BadgeEstado estado={c.estado} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    {c.estado !== 'pagado' && (
                      <button
                        onClick={() => abrirModal(c)}
                        className="text-xs text-primary hover:underline font-medium"
                      >
                        Abonar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Historial de abonos */}
      {abonos.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Historial de abonos</h2>
          </div>
          <div className="divide-y divide-border">
            {abonos.map(a => (
              <div key={a.id} className="px-4 py-3 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs text-foreground-muted">{fmtFecha(a.creado_en)}</p>
                  {a.notas && <p className="text-xs text-foreground mt-0.5">{a.notas}</p>}
                </div>
                <p className="text-sm font-bold font-mono text-success shrink-0">+{fmt(a.monto, simboloMoneda)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal registrar abono */}
      {modalAbierto && cuotaSeleccionada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-card border border-border rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border">
              <div>
                <h3 className="text-sm font-bold text-foreground">Registrar abono</h3>
                <p className="text-[11px] text-foreground-muted mt-0.5">
                  Cuota #{cuotaSeleccionada.numero_cuota} · {fmtFecha(cuotaSeleccionada.fecha_vencimiento)}
                </p>
              </div>
              <button onClick={() => setModalAbierto(false)} className="text-foreground-muted hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-5 py-4 flex flex-col gap-4">
              <div>
                <label className="text-xs font-medium text-foreground-muted block mb-1.5">
                  Monto a abonar
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-foreground-muted">{simboloMoneda}</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={monto}
                    onChange={e => setMonto(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <p className="text-[10px] text-foreground-muted mt-1">
                  Monto cuota: {fmt(cuotaSeleccionada.monto, simboloMoneda)}
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-foreground-muted block mb-1.5">
                  Notas (opcional)
                </label>
                <input
                  type="text"
                  value={notas}
                  onChange={e => setNotas(e.target.value)}
                  placeholder="Ej: Transferencia, efectivo..."
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
            <div className="px-5 pb-5 flex gap-2">
              <button
                onClick={() => setModalAbierto(false)}
                className="flex-1 py-2 text-sm font-medium rounded-lg border border-border text-foreground-muted hover:bg-background-subtle"
              >
                Cancelar
              </button>
              <button
                onClick={registrarAbono}
                disabled={guardando}
                className="flex-1 py-2 text-sm font-medium rounded-lg bg-primary text-white hover:bg-primary-hover disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {guardando && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
