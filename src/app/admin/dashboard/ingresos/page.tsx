export const dynamic = 'force-dynamic'

import { crearClienteServidor } from '@/lib/supabase/servidor'
import { redirect } from 'next/navigation'
import { IngresosCliente } from './ingresos-cliente'

const ESTADOS_INGRESO = ['procesando', 'completado']

interface Props {
  searchParams: Promise<{ desde?: string; hasta?: string }>
}

export default async function PáginaIngresos({ searchParams }: Props) {
  const supabase = await crearClienteServidor()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin')

  const params = await searchParams
  const ahora = new Date()

  const desde = params.desde ?? new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString().split('T')[0]
  const hasta = params.hasta ?? new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0).toISOString().split('T')[0]

  // Calcular período anterior (mismo número de días)
  const diasRango = Math.ceil(
    (new Date(hasta + 'T00:00:00').getTime() - new Date(desde + 'T00:00:00').getTime()) / (1000 * 60 * 60 * 24)
  ) + 1
  const desdeAnt = new Date(new Date(desde + 'T00:00:00').getTime() - diasRango * 24 * 60 * 60 * 1000)
    .toISOString().split('T')[0]
  const hastaAnt = new Date(new Date(hasta + 'T00:00:00').getTime() - diasRango * 24 * 60 * 60 * 1000)
    .toISOString().split('T')[0]

  const [
    { data: pedidos },
    { data: pedidosAnt },
    { data: config },
  ] = await Promise.all([
    supabase
      .from('pedidos')
      .select('id, numero_orden, nombres, total, estado, creado_en, tipo, simbolo_moneda, forma_pago, es_venta_manual, items')
      .in('estado', ESTADOS_INGRESO)
      .gte('creado_en', `${desde}T00:00:00`)
      .lte('creado_en', `${hasta}T23:59:59`)
      .order('creado_en', { ascending: false }),
    supabase
      .from('pedidos')
      .select('total, creado_en')
      .in('estado', ESTADOS_INGRESO)
      .gte('creado_en', `${desdeAnt}T00:00:00`)
      .lte('creado_en', `${hastaAnt}T23:59:59`),
    supabase
      .from('configuracion_tienda')
      .select('simbolo_moneda')
      .single(),
  ])

  const totalAnterior = (pedidosAnt ?? []).reduce((s, p) => s + Number(p.total ?? 0), 0)
  const pedidosAntCount = pedidosAnt?.length ?? 0

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-foreground">Ingresos</h1>
        <p className="text-xs text-foreground-muted mt-0.5">
          Solo pedidos procesando o completados
        </p>
      </div>

      <IngresosCliente
        pedidos={pedidos ?? []}
        desde={desde}
        hasta={hasta}
        simboloMoneda={config?.simbolo_moneda ?? '$'}
        totalAnterior={totalAnterior}
        pedidosAntCount={pedidosAntCount}
      />
    </div>
  )
}
