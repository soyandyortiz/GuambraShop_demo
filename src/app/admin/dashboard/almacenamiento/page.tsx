export const dynamic = 'force-dynamic'

import { HardDrive, Database, ExternalLink, ArrowUpRight, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react'
import { obtenerUsoStorage, obtenerUsoDB, formatearBytes, LIMITE_STORAGE_BYTES, LIMITE_DB_BYTES } from '@/lib/storage-uso'
import { cn } from '@/lib/utils'
import { BotonMigrarImagenes } from '@/components/admin/boton-migrar-imagenes'
import { BotonActualizarStorage } from '@/components/admin/boton-actualizar-storage'
import { BotonLimpiarComprobantes } from '@/components/admin/boton-limpiar-comprobantes'
import { BotonVerificarLimites } from '@/components/admin/boton-verificar-limites'

export default async function PáginaAlmacenamiento() {
  const [uso, db] = await Promise.all([obtenerUsoStorage(), obtenerUsoDB()])

  const colorStorage =
    uso.nivel === 'critico'    ? { barra: 'bg-red-500',    texto: 'text-red-600',    bg: 'bg-red-50',    borde: 'border-red-200' } :
    uso.nivel === 'advertencia'? { barra: 'bg-amber-500',  texto: 'text-amber-600',  bg: 'bg-amber-50',  borde: 'border-amber-200' } :
                                 { barra: 'bg-emerald-500', texto: 'text-emerald-600', bg: 'bg-emerald-50', borde: 'border-emerald-200' }

  const colorDB =
    db.nivel === 'critico'    ? { barra: 'bg-red-500',    texto: 'text-red-600',    bg: 'bg-red-50',    borde: 'border-red-200' } :
    db.nivel === 'advertencia'? { barra: 'bg-amber-500',  texto: 'text-amber-600',  bg: 'bg-amber-50',  borde: 'border-amber-200' } :
                                 { barra: 'bg-emerald-500', texto: 'text-emerald-600', bg: 'bg-emerald-50', borde: 'border-emerald-200' }

  const IconoStorage = uso.nivel === 'critico' ? XCircle : uso.nivel === 'advertencia' ? AlertTriangle : CheckCircle2
  const IconoDB      = db.nivel  === 'critico' ? XCircle : db.nivel  === 'advertencia' ? AlertTriangle : CheckCircle2

  const libreStorageBytes = LIMITE_STORAGE_BYTES - uso.totalBytes
  const libreDBBytes      = LIMITE_DB_BYTES - db.bytes

  return (
    <div className="flex flex-col gap-8 pb-12 max-w-3xl">

      {/* Cabecera */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <HardDrive className="w-7 h-7 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">Almacenamiento</h1>
          <p className="text-sm text-foreground-muted font-medium">
            Límites del plan gratuito Supabase · Se restauran al upgrade
          </p>
        </div>
      </div>

      {/* ── Base de datos (500 MB) ── */}
      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-black text-foreground uppercase tracking-widest flex items-center gap-2">
          <Database className="w-4 h-4 text-primary" />
          Base de datos PostgreSQL
        </h2>

        <div className={cn('rounded-3xl border-2 p-6', colorDB.bg, colorDB.borde)}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <IconoDB className={cn('w-5 h-5', colorDB.texto)} />
              <span className={cn('text-sm font-bold', colorDB.texto)}>
                {db.nivel === 'critico'     ? 'Base de datos crítica' :
                 db.nivel === 'advertencia' ? 'Base de datos limitada' :
                 'Base de datos saludable'}
              </span>
            </div>
            <span className={cn('text-2xl font-black', colorDB.texto)}>
              {db.porcentaje.toFixed(1)}%
            </span>
          </div>

          <div className="h-4 rounded-full bg-white/60 overflow-hidden mb-4">
            <div
              className={cn('h-full rounded-full transition-all', colorDB.barra)}
              style={{ width: `${db.porcentaje}%` }}
            />
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className={cn('text-lg font-black', colorDB.texto)}>{formatearBytes(db.bytes)}</p>
              <p className="text-xs text-foreground-muted font-medium">Usado</p>
            </div>
            <div>
              <p className="text-lg font-black text-foreground-muted">{formatearBytes(libreDBBytes)}</p>
              <p className="text-xs text-foreground-muted font-medium">Libre</p>
            </div>
            <div>
              <p className="text-lg font-black text-foreground">{formatearBytes(LIMITE_DB_BYTES)}</p>
              <p className="text-xs text-foreground-muted font-medium">Límite</p>
            </div>
          </div>
        </div>

        {db.nivel !== 'ok' && (
          <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-3xl p-6 text-white shadow-lg shadow-indigo-200">
            <h3 className="text-base font-black mb-1">¿Necesitas más capacidad de BD?</h3>
            <p className="text-sm text-white/80 mb-4">
              Supabase Pro incluye <strong className="text-white">8 GB de base de datos</strong> por{' '}
              <strong className="text-white">$25/mes</strong>.
            </p>
            <a
              href="https://supabase.com/pricing"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-white text-indigo-700 font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-indigo-50 transition-colors"
            >
              Ver planes de Supabase
              <ArrowUpRight className="w-4 h-4" />
            </a>
          </div>
        )}
      </section>

      {/* ── File Storage (1 GB) ── */}
      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-black text-foreground uppercase tracking-widest flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-primary" />
          Archivos e imágenes
        </h2>

        <div className={cn('rounded-3xl border-2 p-6', colorStorage.bg, colorStorage.borde)}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <IconoStorage className={cn('w-5 h-5', colorStorage.texto)} />
              <span className={cn('text-sm font-bold', colorStorage.texto)}>
                {uso.nivel === 'critico'     ? 'Almacenamiento crítico' :
                 uso.nivel === 'advertencia' ? 'Espacio limitado' :
                 'Almacenamiento saludable'}
              </span>
            </div>
            <span className={cn('text-2xl font-black', colorStorage.texto)}>
              {uso.porcentaje.toFixed(1)}%
            </span>
          </div>

          <div className="h-4 rounded-full bg-white/60 overflow-hidden mb-4">
            <div
              className={cn('h-full rounded-full transition-all', colorStorage.barra)}
              style={{ width: `${uso.porcentaje}%` }}
            />
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className={cn('text-lg font-black', colorStorage.texto)}>{formatearBytes(uso.totalBytes)}</p>
              <p className="text-xs text-foreground-muted font-medium">Usado</p>
            </div>
            <div>
              <p className="text-lg font-black text-foreground-muted">{formatearBytes(libreStorageBytes)}</p>
              <p className="text-xs text-foreground-muted font-medium">Libre</p>
            </div>
            <div>
              <p className="text-lg font-black text-foreground">{formatearBytes(LIMITE_STORAGE_BYTES)}</p>
              <p className="text-xs text-foreground-muted font-medium">Límite</p>
            </div>
          </div>
        </div>

        {/* Desglose por bucket */}
        {uso.buckets.length > 0 && (
          <div className="bg-card border border-card-border rounded-3xl overflow-hidden shadow-sm">
            <div className="divide-y divide-border">
              {uso.buckets.map(bucket => (
                <div key={bucket.id} className="p-5">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">{bucket.icono}</span>
                      <div>
                        <p className="text-sm font-bold text-foreground">{bucket.nombre}</p>
                        <p className="text-xs text-foreground-muted">
                          {bucket.archivos} {bucket.archivos === 1 ? 'archivo' : 'archivos'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-foreground">{formatearBytes(bucket.bytes)}</p>
                      <p className="text-xs text-foreground-muted">
                        {bucket.porcentaje.toFixed(1)}% del espacio usado
                      </p>
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-background-subtle overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary/70"
                      style={{ width: `${(bucket.bytes / LIMITE_STORAGE_BYTES) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <BotonMigrarImagenes />

        {/* Referencia de capacidad */}
        <div>
          <h3 className="text-sm font-black text-foreground uppercase tracking-widest mb-4">
            Referencia de capacidad
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { icono: '🖼️', titulo: 'Fotos de producto', desc: 'Aprox. 500 KB c/u', cantidad: `~${Math.floor(libreStorageBytes / 512_000).toLocaleString()} fotos` },
              { icono: '🧾', titulo: 'Comprobantes de pago', desc: 'Aprox. 300 KB c/u', cantidad: `~${Math.floor(libreStorageBytes / 307_200).toLocaleString()} comprobantes` },
              { icono: '📄', titulo: 'Facturas PDF', desc: 'Aprox. 80 KB c/u', cantidad: `~${Math.floor(libreStorageBytes / 81_920).toLocaleString()} facturas` },
            ].map(item => (
              <div key={item.titulo} className="bg-card border border-card-border rounded-2xl p-4">
                <span className="text-2xl">{item.icono}</span>
                <p className="text-sm font-bold text-foreground mt-2">{item.titulo}</p>
                <p className="text-xs text-foreground-muted">{item.desc}</p>
                <p className="text-sm font-black text-primary mt-2">{item.cantidad}</p>
                <p className="text-[10px] text-foreground-muted">restantes con el espacio libre</p>
              </div>
            ))}
          </div>
        </div>

        <BotonLimpiarComprobantes />

        {uso.nivel !== 'ok' && (
          <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-3xl p-6 text-white shadow-lg shadow-indigo-200">
            <h3 className="text-base font-black mb-1">¿Necesitas más espacio?</h3>
            <p className="text-sm text-white/80 mb-4">
              Supabase Pro incluye <strong className="text-white">100 GB de Storage</strong> por{' '}
              <strong className="text-white">$25/mes</strong>.
            </p>
            <a
              href="https://supabase.com/pricing"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-white text-indigo-700 font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-indigo-50 transition-colors"
            >
              Ver planes de Supabase
              <ArrowUpRight className="w-4 h-4" />
            </a>
          </div>
        )}
      </section>

      {/* ── Acciones ── */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-black text-foreground uppercase tracking-widest">
          Acciones
        </h2>
        <BotonVerificarLimites porcentajeDB={db.porcentaje} porcentajeStorage={uso.porcentaje} />
        <BotonActualizarStorage />
      </section>

      <p className="text-xs text-foreground-muted text-center">
        Los datos de archivos se cachean 1 hora. El tamaño de BD es en tiempo real.{' '}
        <ExternalLink className="w-3 h-3 inline" />
      </p>
    </div>
  )
}
