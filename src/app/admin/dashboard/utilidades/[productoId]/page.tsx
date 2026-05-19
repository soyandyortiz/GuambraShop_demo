export const dynamic = 'force-dynamic'

import { crearClienteServidor } from '@/lib/supabase/servidor'
import { redirect, notFound } from 'next/navigation'
import { DetalleCliente } from './detalle-cliente'

interface Props {
  params: Promise<{ productoId: string }>
  searchParams: Promise<{ desde?: string; hasta?: string }>
}

export interface VentaProducto {
  pedido_id: string
  numero_orden: string
  cliente: string
  fecha: string
  precio_vendido: number
  cantidad: number
  costo_unitario: number
  utilidad: number
}

export default async function PáginaDetalleUtilidad({ params, searchParams }: Props) {
  const supabase = await crearClienteServidor()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin')

  const { productoId } = await params
  const sp = await searchParams

  const ahora = new Date()
  const desde = sp.desde ?? new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString().split('T')[0]
  const hasta = sp.hasta ?? new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0).toISOString().split('T')[0]

  const [
    { data: producto },
    { data: ventas },
    { data: config },
  ] = await Promise.all([
    supabase
      .from('productos')
      .select('id, nombre, precio, precio_costo')
      .eq('id', productoId)
      .single(),
    supabase.rpc('ventas_producto', {
      p_producto_id: productoId,
      p_desde: desde,
      p_hasta: hasta,
    }),
    supabase
      .from('configuracion_tienda')
      .select('simbolo_moneda')
      .single(),
  ])

  if (!producto) notFound()

  return (
    <div className="flex flex-col gap-4">
      <DetalleCliente
        producto={producto}
        ventas={(ventas as VentaProducto[]) ?? []}
        desde={desde}
        hasta={hasta}
        simboloMoneda={config?.simbolo_moneda ?? '$'}
      />
    </div>
  )
}
