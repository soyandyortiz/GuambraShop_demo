'use client'

import { useState } from 'react'
import { ShieldCheck, Loader2, CheckCircle2, AlertTriangle, Send } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  porcentajeDB: number
  porcentajeStorage: number
}

export function BotonVerificarLimites({ porcentajeDB, porcentajeStorage }: Props) {
  const [estado, setEstado] = useState<'idle' | 'cargando' | 'ok' | 'alerta' | 'error'>('idle')
  const [mensaje, setMensaje] = useState('')

  const hayAlerta = porcentajeDB >= 75 || porcentajeStorage >= 70

  async function verificar() {
    setEstado('cargando')
    setMensaje('')
    try {
      const res = await fetch('/api/admin/verificar-limites', { method: 'POST' })
      const data = await res.json()

      if (!res.ok || !data.ok) {
        setEstado('error')
        setMensaje(data.error ?? 'Error al verificar.')
        return
      }

      if (data.alerta) {
        setEstado('alerta')
        setMensaje(
          data.telegram
            ? 'Alerta enviada por Telegram al equipo.'
            : 'Hay alertas activas. Configura Telegram para recibir notificaciones automáticas.'
        )
      } else {
        setEstado('ok')
        setMensaje('Todo dentro de límites normales.')
      }
    } catch {
      setEstado('error')
      setMensaje('No se pudo conectar al servidor.')
    }
  }

  const colorBtn =
    estado === 'ok'    ? 'bg-emerald-600 hover:bg-emerald-700' :
    estado === 'alerta'? 'bg-amber-500 hover:bg-amber-600' :
    estado === 'error' ? 'bg-red-500 hover:bg-red-600' :
    hayAlerta          ? 'bg-amber-500 hover:bg-amber-600' :
                         'bg-foreground hover:bg-foreground/80'

  const Icono =
    estado === 'cargando' ? Loader2 :
    estado === 'ok'       ? CheckCircle2 :
    estado === 'alerta'   ? Send :
    estado === 'error'    ? AlertTriangle :
    ShieldCheck

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={verificar}
        disabled={estado === 'cargando'}
        className={cn(
          'flex items-center justify-center gap-2 w-full py-3 px-5 rounded-2xl text-white font-bold text-sm transition-colors disabled:opacity-60',
          colorBtn
        )}
      >
        <Icono className={cn('w-4 h-4', estado === 'cargando' && 'animate-spin')} />
        {estado === 'cargando' ? 'Verificando...' :
         estado === 'ok'       ? 'Todo en orden' :
         estado === 'alerta'   ? 'Alerta enviada' :
         estado === 'error'    ? 'Error — reintentar' :
         hayAlerta             ? 'Enviar alerta Telegram ahora' :
                                 'Verificar límites y notificar'}
      </button>

      {mensaje && (
        <p className={cn(
          'text-xs text-center font-medium px-3',
          estado === 'ok'    ? 'text-emerald-600' :
          estado === 'alerta'? 'text-amber-600' :
          'text-red-600'
        )}>
          {mensaje}
        </p>
      )}
    </div>
  )
}
