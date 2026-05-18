import { NextRequest, NextResponse } from 'next/server'
import { crearClienteServidor } from '@/lib/supabase/servidor'

export async function GET(req: NextRequest) {
  const supabase = await crearClienteServidor()
  const q = req.nextUrl.searchParams.get('q')?.trim() ?? ''

  let query = supabase
    .from('clientes')
    .select('razon_social, tipo_identificacion, identificacion, email, telefono, direccion, ciudad, provincia, creado_en')
    .order('creado_en', { ascending: false })
    .limit(5000)

  if (q) {
    query = query.or(
      `razon_social.ilike.%${q}%,identificacion.ilike.%${q}%,email.ilike.%${q}%,telefono.ilike.%${q}%,ciudad.ilike.%${q}%`
    )
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const cols = ['Razón Social', 'Tipo ID', 'Identificación', 'Email', 'Teléfono', 'Dirección', 'Ciudad', 'Provincia', 'Fecha Registro']
  const rows = (data ?? []).map(c => [
    c.razon_social,
    c.tipo_identificacion,
    c.identificacion,
    c.email ?? '',
    c.telefono ?? '',
    c.direccion ?? '',
    c.ciudad ?? '',
    c.provincia ?? '',
    new Date(c.creado_en).toLocaleString('es-EC'),
  ])

  const csv = [cols, ...rows]
    .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\r\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type':        'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="clientes-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
