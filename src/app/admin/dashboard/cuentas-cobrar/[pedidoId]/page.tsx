export const dynamic = 'force-dynamic'

import { crearClienteServidor } from '@/lib/supabase/servidor'
import { redirect, notFound } from 'next/navigation'
import { DetalleCuentaCliente } from './detalle-cliente'

export interface AbonoDetalle {
  id: string
  monto: number
  notas: string | null
  creado_en: string
  cuota_id: string | null
}

export interface CuotaDetalle {
  id: string
  numero_cuota: number
  monto: number
  fecha_vencimiento: string
  fecha_pago: string | null
  estado: string
}

export interface PedidoDetalle {
  id: string
  numero_orden: string
  nombres: string
  credito_cuotas: number
  credito_frecuencia: string
  credito_tasa: number
  credito_total: number
  credito_monto_cuota: number
  credito_saldo_pendiente: number
  creado_en: string
}

export default async function PáginaDetalleCuenta({
  params,
}: {
  params: Promise<{ pedidoId: string }>
}) {
  const { pedidoId } = await params
  const supabase = await crearClienteServidor()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin')

  const [{ data: pedido }, { data: cuotas }, { data: abonos }, { data: config }] = await Promise.all([
    supabase
      .from('pedidos')
      .select('id, numero_orden, nombres, credito_cuotas, credito_frecuencia, credito_tasa, credito_total, credito_monto_cuota, credito_saldo_pendiente, creado_en')
      .eq('id', pedidoId)
      .eq('es_credito', true)
      .single(),
    supabase
      .from('cuotas_credito')
      .select('id, numero_cuota, monto, fecha_vencimiento, fecha_pago, estado')
      .eq('pedido_id', pedidoId)
      .order('numero_cuota', { ascending: true }),
    supabase
      .from('abonos_credito')
      .select('id, monto, notas, creado_en, cuota_id')
      .eq('pedido_id', pedidoId)
      .order('creado_en', { ascending: false }),
    supabase
      .from('configuracion_tienda')
      .select('simbolo_moneda')
      .single(),
  ])

  if (!pedido) notFound()

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-foreground">Cuenta por Cobrar</h1>
        <p className="text-xs text-foreground-muted mt-0.5">
          {pedido.nombres} · {pedido.numero_orden}
        </p>
      </div>
      <DetalleCuentaCliente
        pedido={pedido as PedidoDetalle}
        cuotas={(cuotas ?? []) as CuotaDetalle[]}
        abonos={(abonos ?? []) as AbonoDetalle[]}
        simboloMoneda={config?.simbolo_moneda ?? '$'}
      />
    </div>
  )
}
