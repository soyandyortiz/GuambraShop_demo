import Link from 'next/link'
import { AlertTriangle, HardDrive, Database, ArrowRight } from 'lucide-react'
import { obtenerUsoStorage, obtenerUsoDB, formatearBytes, LIMITE_STORAGE_BYTES, LIMITE_DB_BYTES } from '@/lib/storage-uso'

export async function BannerAlmacenamiento() {
  const [uso, db] = await Promise.all([obtenerUsoStorage(), obtenerUsoDB()])

  const mostrarStorage = uso.nivel !== 'ok'
  const mostrarDB      = db.nivel  !== 'ok'

  if (!mostrarStorage && !mostrarDB) return null

  return (
    <div className="flex flex-col gap-2 mb-6">
      {mostrarDB && (
        <BannerItem
          critico={db.nivel === 'critico'}
          icono={<Database className="w-4 h-4" />}
          titulo={
            db.nivel === 'critico'
              ? `BD al ${db.porcentaje.toFixed(0)}% — Riesgo de bloqueo`
              : `BD al ${db.porcentaje.toFixed(0)}% — Espacio limitado`
          }
          detalle={
            db.nivel === 'critico'
              ? `${formatearBytes(db.bytes)} de ${formatearBytes(LIMITE_DB_BYTES)}. La base de datos puede dejar de aceptar nuevos registros.`
              : `${formatearBytes(db.bytes)} de ${formatearBytes(LIMITE_DB_BYTES)} usados. Considera actualizar a Supabase Pro.`
          }
        />
      )}

      {mostrarStorage && (
        <BannerItem
          critico={uso.nivel === 'critico'}
          icono={<HardDrive className="w-4 h-4" />}
          titulo={
            uso.nivel === 'critico'
              ? `Archivos al ${uso.porcentaje.toFixed(0)}% — Riesgo de bloqueo`
              : `Archivos al ${uso.porcentaje.toFixed(0)}% — Espacio limitado`
          }
          detalle={
            uso.porcentaje >= 100
              ? 'La subida de imágenes está bloqueada. Elimina archivos para continuar.'
              : uso.nivel === 'critico'
                ? `${formatearBytes(uso.totalBytes)} de ${formatearBytes(LIMITE_STORAGE_BYTES)}. La tienda podría dejar de aceptar imágenes.`
                : `${formatearBytes(uso.totalBytes)} de ${formatearBytes(LIMITE_STORAGE_BYTES)} usados. Libera espacio o actualiza a Pro.`
          }
        />
      )}
    </div>
  )
}

function BannerItem({
  critico,
  icono,
  titulo,
  detalle,
}: {
  critico: boolean
  icono: React.ReactNode
  titulo: string
  detalle: string
}) {
  return (
    <div className={`rounded-2xl border px-4 py-3 flex items-center gap-3 ${
      critico ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
    }`}>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
        critico ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
      }`}>
        {critico ? <AlertTriangle className="w-4 h-4" /> : icono}
      </div>

      <div className="flex-1 min-w-0">
        <p className={`text-sm font-bold ${critico ? 'text-red-700' : 'text-amber-700'}`}>
          {titulo}
        </p>
        <p className={`text-xs mt-0.5 ${critico ? 'text-red-600' : 'text-amber-600'}`}>
          {detalle}
        </p>
      </div>

      <Link
        href="/admin/dashboard/almacenamiento"
        className={`flex items-center gap-1 text-xs font-bold flex-shrink-0 ${
          critico ? 'text-red-700 hover:text-red-900' : 'text-amber-700 hover:text-amber-900'
        } transition-colors`}
      >
        Ver detalle
        <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  )
}
