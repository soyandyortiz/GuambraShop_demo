export const dynamic = 'force-dynamic'

import { crearClienteServidor } from '@/lib/supabase/servidor'
import { TablaPedidos } from '@/components/admin/pedidos/tabla-pedidos'
import type { Pedido, EstadoPedido } from '@/types'

const POR_PAGINA = 50

const ESTADOS_TABS = ['pendiente_validacion', 'procesando', 'en_espera', 'completado', 'cancelado'] as const

export default async function PáginaPedidos({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>
}) {
  const params  = await searchParams
  const pagina  = Math.max(1, parseInt(params.p ?? '1'))
  const q       = params.q?.trim() ?? ''
  const tipo    = params.tipo  ?? 'todos'
  const estado  = params.estado ?? 'todos'
  const fecha   = params.fecha  ?? 'todos'
  const orden   = params.orden  ?? 'reciente'
  const offset  = (pagina - 1) * POR_PAGINA

  const supabase = await crearClienteServidor()

  // ── Query principal con filtros ─────────────────────────────
  let query = supabase
    .from('pedidos')
    .select('*, datos_facturacion, comprobante_url, comprobante_eliminar_en', { count: 'exact' })

  if (q) query = query.or(`nombres.ilike.%${q}%,email.ilike.%${q}%,numero_orden.ilike.%${q}%,whatsapp.ilike.%${q}%`)
  if (tipo   !== 'todos') query = query.eq('tipo',   tipo)
  if (estado !== 'todos') query = query.eq('estado', estado as EstadoPedido)

  if (fecha !== 'todos') {
    const ahora = new Date()
    const inicios: Record<string, Date> = {
      hoy:    new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()),
      semana: new Date(ahora.getTime() - 7 * 24 * 60 * 60 * 1000),
      mes:    new Date(ahora.getFullYear(), ahora.getMonth(), 1),
    }
    if (inicios[fecha]) query = query.gte('creado_en', inicios[fecha].toISOString())
  }

  switch (orden) {
    case 'antiguo': query = query.order('creado_en', { ascending: true });  break
    case 'mayor':   query = query.order('total',     { ascending: false }); break
    case 'menor':   query = query.order('total',     { ascending: true });  break
    default:        query = query.order('creado_en', { ascending: false }); break
  }

  // ── Conteos para las pestañas + config ─────────────────────
  const [{ data: pedidos, count }, { data: config }, { count: totalGlobal }, ...conteosEstado] = await Promise.all([
    query.range(offset, offset + POR_PAGINA - 1),
    supabase
      .from('configuracion_tienda')
      .select('nombre_tienda, simbolo_moneda, ticket_ancho_papel, ticket_linea_1, ticket_linea_2, ticket_linea_3, ticket_linea_4, ticket_texto_pie, ticket_pie_2, ticket_mostrar_precio_unit')
      .single(),
    // Conteo global sin filtros para el tab "Todos"
    supabase.from('pedidos').select('*', { count: 'exact', head: true }),
    ...ESTADOS_TABS.map(e =>
      supabase.from('pedidos').select('*', { count: 'exact', head: true }).eq('estado', e)
    ),
  ])

  const conteoEstados: Record<string, number> = { todos: totalGlobal ?? 0 }
  ESTADOS_TABS.forEach((e, i) => { conteoEstados[e] = conteosEstado[i].count ?? 0 })

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-foreground">Pedidos</h1>
        <p className="text-xs text-foreground-muted mt-0.5">
          Órdenes de clientes — delivery y entrega en local físico
        </p>
      </div>

      <TablaPedidos
        pedidos={(pedidos as Pedido[]) ?? []}
        total={count ?? 0}
        pagina={pagina}
        porPagina={POR_PAGINA}
        filtros={{ q, tipo, estado, fecha, orden }}
        conteoEstados={conteoEstados}
        configTicket={{
          nombreTienda:      config?.nombre_tienda  ?? 'Mi Tienda',
          simboloMoneda:     config?.simbolo_moneda ?? '$',
          anchoPapel:        ((config as any)?.ticket_ancho_papel    ?? '80') as '58' | '80',
          linea1:            (config as any)?.ticket_linea_1          ?? null,
          linea2:            (config as any)?.ticket_linea_2          ?? null,
          linea3:            (config as any)?.ticket_linea_3          ?? null,
          linea4:            (config as any)?.ticket_linea_4          ?? null,
          pie1:              (config as any)?.ticket_texto_pie        ?? null,
          pie2:              (config as any)?.ticket_pie_2            ?? null,
          mostrarPrecioUnit: (config as any)?.ticket_mostrar_precio_unit !== false,
        }}
      />
    </div>
  )
}
