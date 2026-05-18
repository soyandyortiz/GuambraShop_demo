import { NextResponse } from 'next/server'
import { crearClienteServidor } from '@/lib/supabase/servidor'
import { obtenerUsoStorage, obtenerUsoDB } from '@/lib/storage-uso'

export async function POST() {
  const supabase = await crearClienteServidor()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'no_auth' }, { status: 401 })

  const [storage, db] = await Promise.all([obtenerUsoStorage(), obtenerUsoDB()])

  const alertas: string[] = []

  if (db.nivel !== 'ok') {
    alertas.push(
      db.nivel === 'critico'
        ? `🔴 <b>Base de datos CRÍTICA</b> — ${db.porcentaje.toFixed(1)}% usado (${(db.bytes / 1_048_576).toFixed(1)} MB de 500 MB). La tienda puede dejar de funcionar.`
        : `🟡 <b>Base de datos al ${db.porcentaje.toFixed(1)}%</b> — ${(db.bytes / 1_048_576).toFixed(1)} MB de 500 MB. Considera upgrade a Supabase Pro.`
    )
  }

  if (storage.nivel !== 'ok') {
    alertas.push(
      storage.nivel === 'critico'
        ? `🔴 <b>Archivos CRÍTICO</b> — ${storage.porcentaje.toFixed(1)}% usado (${(storage.totalBytes / 1_073_741_824).toFixed(2)} GB de 1 GB). Subida de imágenes bloqueada.`
        : `🟡 <b>Archivos al ${storage.porcentaje.toFixed(1)}%</b> — ${(storage.totalBytes / 1_048_576).toFixed(0)} MB de 1024 MB. Espacio limitado.`
    )
  }

  const token  = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID

  if (alertas.length === 0) {
    return NextResponse.json({ ok: true, alerta: false, mensaje: 'Todo dentro de límites normales.' })
  }

  if (!token || !chatId) {
    return NextResponse.json({ ok: true, alerta: true, mensaje: alertas.join('\n'), telegram: false })
  }

  const texto = [
    '⚠️ <b>Alerta de límites — GuambraShop</b>',
    '',
    ...alertas,
    '',
    '👉 Revisa <b>Admin → Almacenamiento</b> para más detalles.',
  ].join('\n')

  try {
    const resp = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: texto, parse_mode: 'HTML' }),
    })

    if (!resp.ok) {
      const err = await resp.text()
      console.error('[verificar-limites] Telegram error:', err)
      return NextResponse.json({ ok: false, error: err }, { status: 502 })
    }

    return NextResponse.json({ ok: true, alerta: true, telegram: true })
  } catch (err) {
    console.error('[verificar-limites] fetch error:', err)
    return NextResponse.json({ ok: false, error: 'fetch_failed' }, { status: 502 })
  }
}
