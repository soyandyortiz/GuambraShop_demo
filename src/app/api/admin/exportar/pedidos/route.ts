import { NextRequest, NextResponse } from 'next/server'
import { crearClienteServidor } from '@/lib/supabase/servidor'
import type { EstadoPedido } from '@/types'

export async function GET(req: NextRequest) {
  const supabase = await crearClienteServidor()
  const { searchParams } = req.nextUrl

  const q      = searchParams.get('q')?.trim() ?? ''
  const tipo   = searchParams.get('tipo')   ?? 'todos'
  const estado = searchParams.get('estado') ?? 'todos'
  const fecha  = searchParams.get('fecha')  ?? 'todos'
  const orden  = searchParams.get('orden')  ?? 'reciente'

  let query = supabase
    .from('pedidos')
    .select('numero_orden, nombres, email, whatsapp, tipo, estado, forma_pago, subtotal, descuento_cupon, costo_envio, total, ciudad, provincia, creado_en')

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

  const { data, error } = await query.limit(5000)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const cols = ['Número de Orden', 'Cliente', 'Email', 'WhatsApp', 'Tipo', 'Estado', 'Forma de Pago', 'Subtotal', 'Descuento', 'Envío', 'Total', 'Ciudad', 'Provincia', 'Fecha']
  const rows = (data ?? []).map(p => [
    p.numero_orden,
    p.nombres,
    p.email,
    p.whatsapp,
    p.tipo,
    p.estado,
    p.forma_pago ?? '',
    p.subtotal,
    p.descuento_cupon ?? 0,
    p.costo_envio ?? 0,
    p.total,
    p.ciudad ?? '',
    p.provincia ?? '',
    new Date(p.creado_en).toLocaleString('es-EC'),
  ])

  const csv = [cols, ...rows]
    .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\r\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type':        'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="pedidos-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
