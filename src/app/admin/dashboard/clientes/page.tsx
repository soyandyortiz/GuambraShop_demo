export const dynamic = 'force-dynamic'

import { crearClienteServidor } from '@/lib/supabase/servidor'
import { TablaClientes, type ClienteConPedidos, type PedidoResumen } from '@/components/admin/clientes/tabla-clientes'
import type { EstadoPedido } from '@/types'
import { Users, UserCheck, TrendingUp } from 'lucide-react'

const POR_PAGINA = 50
const ESTADOS_CONFIRMADOS: EstadoPedido[] = ['procesando', 'completado']

export default async function PáginaClientes({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>
}) {
  const params = await searchParams
  const q      = params.q?.trim() ?? ''
  const pagina = Math.max(1, parseInt(params.p ?? '1'))
  const offset = (pagina - 1) * POR_PAGINA

  const supabase = await crearClienteServidor()

  // ── Query paginada de clientes ──────────────────────────────────
  let clientesQuery = supabase
    .from('clientes')
    .select('*', { count: 'exact' })
    .order('creado_en', { ascending: false })
    .range(offset, offset + POR_PAGINA - 1)

  if (q) {
    clientesQuery = clientesQuery.or(
      `razon_social.ilike.%${q}%,identificacion.ilike.%${q}%,email.ilike.%${q}%,telefono.ilike.%${q}%,ciudad.ilike.%${q}%`
    )
  }

  const [
    { data: clientes, count: totalClientes },
    { data: config },
    { count: totalGlobal },
    { data: pedidosGlobales },
  ] = await Promise.all([
    clientesQuery,
    supabase.from('configuracion_tienda').select('simbolo_moneda, pais').single(),
    // Conteo global sin filtro (para métricas)
    supabase.from('clientes').select('*', { count: 'exact', head: true }),
    // Pedidos confirmados para métricas globales (no paginadas)
    supabase
      .from('pedidos')
      .select('cliente_id, total, estado')
      .not('cliente_id', 'is', null)
      .in('estado', ESTADOS_CONFIRMADOS),
  ])

  // Pedidos de los clientes visibles en esta página
  const idsVisibles = (clientes ?? []).map(c => c.id)
  const { data: pedidosPagina } = idsVisibles.length > 0
    ? await supabase
        .from('pedidos')
        .select('cliente_id, numero_orden, total, estado, creado_en, tipo')
        .in('cliente_id', idsVisibles)
        .neq('estado', 'cancelado')
    : { data: [] }

  // Mapa de pedidos para la página actual
  const pedidosPorCliente = new Map<string, PedidoResumen[]>()
  for (const p of pedidosPagina ?? []) {
    if (!p.cliente_id) continue
    const lista = pedidosPorCliente.get(p.cliente_id) ?? []
    lista.push({
      numero_orden: p.numero_orden,
      total:        Number(p.total),
      estado:       p.estado as EstadoPedido,
      creado_en:    p.creado_en,
      tipo:         p.tipo,
    })
    pedidosPorCliente.set(p.cliente_id, lista)
  }

  const clientesConPedidos: ClienteConPedidos[] = (clientes ?? []).map(c => {
    const listaPedidos = pedidosPorCliente.get(c.id) ?? []
    const totalGastado = listaPedidos
      .filter(p => (ESTADOS_CONFIRMADOS as string[]).includes(p.estado))
      .reduce((s, p) => s + p.total, 0)
    const ultimoPedido = listaPedidos.length > 0
      ? listaPedidos.reduce((a, b) => a.creado_en > b.creado_en ? a : b).creado_en
      : null

    return {
      ...c,
      pedidos:          listaPedidos,
      total_pedidos:    listaPedidos.length,
      total_gastado:    +totalGastado.toFixed(2),
      ultimo_pedido_en: ultimoPedido,
    }
  })

  // Métricas globales
  const mapaGlobal = new Map<string, number>()
  for (const p of pedidosGlobales ?? []) {
    if (!p.cliente_id) continue
    mapaGlobal.set(p.cliente_id, (mapaGlobal.get(p.cliente_id) ?? 0) + Number(p.total))
  }
  const conActivas     = mapaGlobal.size
  const totalFacturado = [...mapaGlobal.values()].reduce((s, v) => s + v, 0)
  const simbolo        = config?.simbolo_moneda ?? '$'
  const pais           = config?.pais ?? 'EC'

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
          <Users className="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Base de Datos de Clientes</h1>
          <p className="text-sm text-foreground-muted mt-0.5">
            Gestión de perfiles, historial de compras y facturación
          </p>
        </div>
      </div>

      {/* Métricas globales */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-card-border p-5 rounded-2xl shadow-sm">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center mb-3">
            <Users className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-black text-foreground">{totalGlobal ?? 0}</p>
          <p className="text-xs font-bold text-foreground-muted uppercase tracking-wider">Clientes Registrados</p>
        </div>
        <div className="bg-card border border-card-border p-5 rounded-2xl shadow-sm">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center mb-3">
            <UserCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-foreground">{conActivas}</p>
          <p className="text-xs font-bold text-foreground-muted uppercase tracking-wider">Con Compras Activas</p>
        </div>
        <div className="bg-card border border-card-border p-5 rounded-2xl shadow-sm">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
            <TrendingUp className="w-4 h-4 text-primary" />
          </div>
          <p className="text-2xl font-black text-primary">
            {simbolo}{totalFacturado.toLocaleString('es-EC', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs font-bold text-foreground-muted uppercase tracking-wider">Total Facturado</p>
        </div>
      </div>

      <TablaClientes
        clientes={clientesConPedidos}
        total={totalClientes ?? 0}
        pagina={pagina}
        porPagina={POR_PAGINA}
        filtros={{ q }}
        simboloMoneda={simbolo}
        pais={pais}
      />
    </div>
  )
}
