export const dynamic = 'force-dynamic'

import { crearClienteServidor } from '@/lib/supabase/servidor'
import { redirect } from 'next/navigation'
import { UtilidadesCliente } from './utilidades-cliente'

interface Props {
  searchParams: Promise<{ desde?: string; hasta?: string }>
}

export interface FilaUtilidad {
  producto_id: string
  nombre: string
  precio_costo: number
  total_unidades: number
  total_ingresos: number
  total_costo: number
  utilidad_total: number
  precio_min: number
  precio_max: number
}

export default async function PáginaUtilidades({ searchParams }: Props) {
  const supabase = await crearClienteServidor()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin')

  const params = await searchParams
  const ahora = new Date()
  const desde = params.desde ?? new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString().split('T')[0]
  const hasta = params.hasta ?? new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0).toISOString().split('T')[0]

  const [
    { data: filas },
    { data: sinCostoRaw },
    { data: config },
  ] = await Promise.all([
    supabase.rpc('calcular_utilidades', { p_desde: desde, p_hasta: hasta }),
    supabase
      .from('productos')
      .select('id, nombre')
      .or('precio_costo.is.null,precio_costo.eq.0')
      .eq('esta_activo', true)
      .order('nombre'),
    supabase
      .from('configuracion_tienda')
      .select('simbolo_moneda')
      .single(),
  ])

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-foreground">Utilidades</h1>
        <p className="text-xs text-foreground-muted mt-0.5">
          Ganancia real por producto · Solo pedidos procesando o completados
        </p>
      </div>

      <UtilidadesCliente
        filas={(filas as FilaUtilidad[]) ?? []}
        sinCosto={sinCostoRaw ?? []}
        desde={desde}
        hasta={hasta}
        simboloMoneda={config?.simbolo_moneda ?? '$'}
      />
    </div>
  )
}
