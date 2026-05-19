import { crearClienteServidor } from '@/lib/supabase/servidor'
import { ListaPromocionesAdmin } from '@/components/admin/promociones/lista-promociones'
import { PanelEmailMarketing }  from '@/components/admin/promociones/panel-email-marketing'
import { TabsPromocion }        from '@/components/admin/promociones/tabs-promocion'
import Link from 'next/link'
import { Plus, Megaphone } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface Props {
  searchParams: Promise<{ tab?: string }>
}

export default async function PáginaPromociones({ searchParams }: Props) {
  const { tab = 'anuncios' } = await searchParams
  const esEmail = tab === 'email'

  const supabase = await crearClienteServidor()

  const { data: promociones } = esEmail ? { data: [] } : await supabase
    .from('promociones')
    .select('id, nombre, descripcion, precio, imagen_url, formato_imagen, esta_activa, inicia_en, termina_en')
    .order('creado_en', { ascending: false })

  return (
    <div className="flex flex-col gap-6">

      {/* Encabezado */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Megaphone className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Promociones y Marketing</h1>
            <p className="text-sm text-foreground-muted mt-0.5">
              Anuncios emergentes en la tienda y campañas de email masivo
            </p>
          </div>
        </div>

        {!esEmail && (
          <Link
            href="/admin/dashboard/promociones/nueva"
            className="flex items-center gap-2 h-10 px-5 rounded-xl bg-primary text-white text-sm font-bold shadow-md shadow-primary/20 hover:bg-primary/90 active:scale-[0.98] transition-all whitespace-nowrap"
          >
            <Plus className="w-4 h-4" /> Nueva Promoción
          </Link>
        )}
      </div>

      {/* Tabs */}
      <TabsPromocion tabActivo={tab} />

      {/* Contenido */}
      {esEmail
        ? <PanelEmailMarketing />
        : <ListaPromocionesAdmin promociones={promociones ?? []} />
      }
    </div>
  )
}
