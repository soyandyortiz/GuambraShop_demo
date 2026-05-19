export const dynamic = 'force-dynamic'

import { crearClienteServidor } from '@/lib/supabase/servidor'
import { redirect } from 'next/navigation'
import { CuentasCobrarCliente } from './cuentas-cobrar-cliente'
import type { PedidoCC } from './types'

export default async function PáginaCuentasCobrar() {
  const supabase = await crearClienteServidor()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin')

  // Actualizar cuotas vencidas antes de mostrar
  await supabase.rpc('marcar_cuotas_vencidas')

  const [{ data: pedidos }, { data: config }] = await Promise.all([
    supabase
      .from('pedidos')
      .select(`
        id, numero_orden, nombres,
        credito_cuotas, credito_frecuencia, credito_total,
        credito_monto_cuota, credito_saldo_pendiente, creado_en,
        cuotas_credito ( id, numero_cuota, monto, fecha_vencimiento, fecha_pago, estado )
      `)
      .eq('es_credito', true)
      .gt('credito_saldo_pendiente', 0)
      .order('creado_en', { ascending: false }),
    supabase
      .from('configuracion_tienda')
      .select('simbolo_moneda')
      .single(),
  ])

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-foreground">Cuentas por Cobrar</h1>
        <p className="text-xs text-foreground-muted mt-0.5">
          Ventas a crédito con saldo pendiente · Se actualizan al entrar a esta página
        </p>
      </div>
      <CuentasCobrarCliente
        pedidos={(pedidos as unknown as PedidoCC[]) ?? []}
        simboloMoneda={config?.simbolo_moneda ?? '$'}
      />
    </div>
  )
}
