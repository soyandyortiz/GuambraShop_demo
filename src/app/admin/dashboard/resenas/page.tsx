import { crearClienteServidor } from '@/lib/supabase/servidor'
import { redirect } from 'next/navigation'
import { Star } from 'lucide-react'
import { TablaResenas } from '@/components/admin/resenas/tabla-resenas'

export const dynamic = 'force-dynamic'

const POR_PAGINA = 30

export default async function PáginaResenas({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>
}) {
  const params = await searchParams
  const tabActiva = (params.tab === 'aprobadas' ? 'aprobadas' : 'pendientes') as 'pendientes' | 'aprobadas'
  const pagina = Math.max(1, parseInt(params.p ?? '1'))
  const offset = (pagina - 1) * POR_PAGINA

  const supabase = await crearClienteServidor()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin')

  const [
    { data: pendientes, count: totalPendientes },
    { data: aprobadas, count: totalAprobadas },
  ] = await Promise.all([
    supabase
      .from('resenas_producto')
      .select('id, nombre_cliente, cedula, calificacion, comentario, es_visible, creado_en, productos(nombre, slug)', { count: 'exact' })
      .eq('es_visible', false)
      .order('creado_en', { ascending: false })
      .range(
        tabActiva === 'pendientes' ? offset : 0,
        tabActiva === 'pendientes' ? offset + POR_PAGINA - 1 : POR_PAGINA - 1,
      ),
    supabase
      .from('resenas_producto')
      .select('id, nombre_cliente, cedula, calificacion, comentario, es_visible, creado_en, productos(nombre, slug)', { count: 'exact' })
      .eq('es_visible', true)
      .order('creado_en', { ascending: false })
      .range(
        tabActiva === 'aprobadas' ? offset : 0,
        tabActiva === 'aprobadas' ? offset + POR_PAGINA - 1 : POR_PAGINA - 1,
      ),
  ])

  const totalPend = totalPendientes ?? 0
  const totalApro = totalAprobadas ?? 0

  return (
    <div className="flex flex-col gap-6">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Reseñas de Productos</h1>
          <p className="text-xs text-foreground-muted mt-0.5">
            Modera las opiniones de tus clientes antes de publicarlas
          </p>
        </div>
        {totalPend > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-warning/10 border border-warning/20">
            <Star className="w-3.5 h-3.5 text-warning fill-warning" />
            <span className="text-xs font-bold text-warning">
              {totalPend} pendiente{totalPend !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      <TablaResenas
        pendientes={pendientes ?? []}
        aprobadas={aprobadas ?? []}
        totalPendientes={totalPend}
        totalAprobadas={totalApro}
        pagina={pagina}
        tabActiva={tabActiva}
        porPagina={POR_PAGINA}
      />
    </div>
  )
}
