'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import {
  X, Upload, Download, CheckCircle2, AlertCircle,
  Loader2, Users, Trash2, FileSpreadsheet
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { crearClienteSupabase } from '@/lib/supabase/cliente'

interface Contacto { nombre: string; email: string; whatsapp: string; valido: boolean; error?: string }
interface Props {
  campana: { id: string; nombre: string }
  alCerrar: () => void
  alImportar: () => void
}

function validarEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

function parsearCSV(texto: string): Contacto[] {
  const lineas = texto.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  if (lineas.length === 0) return []

  // Detectar si la primera línea es encabezado
  const primeraLinea = lineas[0].toLowerCase()
  const tieneEncabezado = primeraLinea.includes('email') || primeraLinea.includes('nombre') || primeraLinea.includes('correo')
  const inicio = tieneEncabezado ? 1 : 0

  return lineas.slice(inicio).map(linea => {
    // Soporte para coma y punto y coma como separador
    const sep = linea.includes(';') ? ';' : ','
    const cols = linea.split(sep).map(c => c.replace(/^"|"$/g, '').trim())

    const nombre   = cols[0] ?? ''
    const email    = cols[1] ?? ''
    const whatsapp = cols[2] ?? ''

    if (!email) return { nombre, email, whatsapp, valido: false, error: 'Email vacío' }
    if (!validarEmail(email)) return { nombre, email, whatsapp, valido: false, error: 'Email inválido' }
    return { nombre, email, whatsapp, valido: true }
  })
}

async function parsearXLSX(buffer: ArrayBuffer): Promise<Contacto[]> {
  const XLSX = await import('xlsx')
  const wb = XLSX.read(buffer, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { header: 1 }) as unknown[][]

  if (rows.length === 0) return []

  // Detectar encabezado
  const primera = String(rows[0][0] ?? '').toLowerCase()
  const inicio  = primera.includes('nombre') || primera.includes('email') || primera.includes('correo') ? 1 : 0

  return rows.slice(inicio).map(row => {
    const nombre   = String(row[0] ?? '').trim()
    const email    = String(row[1] ?? '').trim()
    const whatsapp = String(row[2] ?? '').trim()

    if (!email) return { nombre, email, whatsapp, valido: false, error: 'Email vacío' }
    if (!validarEmail(email)) return { nombre, email, whatsapp, valido: false, error: 'Email inválido' }
    return { nombre, email, whatsapp, valido: true }
  }).filter(c => c.nombre || c.email)
}

function descargarPlantilla() {
  const filas = [
    ['Nombre', 'Email', 'WhatsApp'],
    ['Juan Pérez', 'juan@ejemplo.com', '0991234567'],
    ['María García', 'maria@ejemplo.com', '0987654321'],
    ['Pedro López', 'pedro@ejemplo.com', ''],
  ]

  import('xlsx').then(XLSX => {
    const ws = XLSX.utils.aoa_to_sheet(filas)
    ws['!cols'] = [{ wch: 25 }, { wch: 30 }, { wch: 15 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Contactos')
    XLSX.writeFile(wb, 'plantilla_contactos.xlsx')
  })
}

export function ModalImportar({ campana, alCerrar, alImportar }: Props) {
  const [contactos, setContactos]   = useState<Contacto[]>([])
  const [archivo,   setArchivo]     = useState<string>('')
  const [guardando, setGuardando]   = useState(false)
  const [paso,      setPaso]        = useState<'subir' | 'preview'>('subir')

  const validos   = contactos.filter(c => c.valido)
  const invalidos = contactos.filter(c => !c.valido)

  const procesar = useCallback(async (file: File) => {
    try {
      const buffer = await file.arrayBuffer()
      let lista: Contacto[] = []

      if (file.name.endsWith('.csv') || file.type === 'text/csv') {
        const texto = new TextDecoder('utf-8').decode(buffer)
        lista = parsearCSV(texto)
      } else {
        lista = await parsearXLSX(buffer)
      }

      if (lista.length === 0) { toast.error('El archivo está vacío o no tiene datos válidos'); return }

      setContactos(lista)
      setArchivo(file.name)
      setPaso('preview')
    } catch {
      toast.error('No se pudo leer el archivo. Asegúrate de usar .xlsx o .csv')
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'text/csv':                                          ['.csv'],
      'application/vnd.ms-excel':                         ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    maxFiles:  1,
    onDrop: files => { if (files[0]) procesar(files[0]) },
  })

  function eliminarContacto(idx: number) {
    setContactos(prev => prev.filter((_, i) => i !== idx))
  }

  async function confirmarImportar() {
    if (validos.length === 0) { toast.error('No hay contactos válidos para importar'); return }
    setGuardando(true)
    const supabase = crearClienteSupabase()

    // Insertar en lotes de 100
    const lotes = []
    for (let i = 0; i < validos.length; i += 100) lotes.push(validos.slice(i, i + 100))

    for (const lote of lotes) {
      const { error } = await supabase.from('contactos_campana').insert(
        lote.map(c => ({
          campana_id: campana.id,
          nombre:     c.nombre || null,
          email:      c.email,
          whatsapp:   c.whatsapp || null,
        }))
      )
      if (error) { toast.error('Error al guardar contactos'); setGuardando(false); return }
    }

    // Actualizar total_contactos en la campaña
    const { data: actual } = await supabase
      .from('campanas_email').select('total_contactos').eq('id', campana.id).single()

    await supabase.from('campanas_email')
      .update({ total_contactos: (actual?.total_contactos ?? 0) + validos.length })
      .eq('id', campana.id)

    toast.success(`${validos.length} contactos importados correctamente`)
    alImportar()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-foreground">Importar contactos</h2>
              <p className="text-xs text-foreground-muted">{campana.nombre}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={descargarPlantilla}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border text-xs font-semibold text-foreground-muted hover:text-foreground hover:bg-background-subtle transition-all"
            >
              <Download className="w-3.5 h-3.5" /> Descargar plantilla
            </button>
            <button onClick={alCerrar} className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-foreground-muted hover:text-foreground transition-all">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">

          {paso === 'subir' && (
            <div className="flex flex-col gap-5">
              {/* Info plantilla */}
              <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 flex items-start gap-3">
                <FileSpreadsheet className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-blue-800 mb-1">Formato requerido</p>
                  <p className="text-xs text-blue-700 leading-relaxed">
                    El archivo debe tener 3 columnas en orden: <strong>Nombre</strong> · <strong>Email</strong> · <strong>WhatsApp</strong><br/>
                    Descarga la plantilla Excel para ver el ejemplo exacto. Se acepta <strong>.xlsx</strong> y <strong>.csv</strong>
                  </p>
                </div>
              </div>

              {/* Dropzone */}
              <div
                {...getRootProps()}
                className={cn(
                  'border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all',
                  isDragActive
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50 hover:bg-background-subtle/50'
                )}
              >
                <input {...getInputProps()} />
                <Upload className={cn('w-10 h-10 mx-auto mb-3', isDragActive ? 'text-primary' : 'text-foreground-muted/30')} />
                {isDragActive ? (
                  <p className="text-sm font-bold text-primary">Suelta el archivo aquí</p>
                ) : (
                  <>
                    <p className="text-sm font-bold text-foreground">Arrastra tu archivo aquí</p>
                    <p className="text-xs text-foreground-muted mt-1">o haz clic para seleccionar · .xlsx · .csv</p>
                  </>
                )}
              </div>
            </div>
          )}

          {paso === 'preview' && (
            <div className="flex flex-col gap-4">
              {/* Resumen */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-border bg-background-subtle p-4 text-center">
                  <p className="text-2xl font-black text-foreground">{contactos.length}</p>
                  <p className="text-xs text-foreground-muted mt-1">Total en archivo</p>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
                  <p className="text-2xl font-black text-emerald-600">{validos.length}</p>
                  <p className="text-xs text-emerald-700 mt-1">Válidos para importar</p>
                </div>
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center">
                  <p className="text-2xl font-black text-red-500">{invalidos.length}</p>
                  <p className="text-xs text-red-600 mt-1">Con errores (se omitirán)</p>
                </div>
              </div>

              <p className="text-xs text-foreground-muted">
                Archivo: <strong className="text-foreground">{archivo}</strong>
                <button onClick={() => { setContactos([]); setArchivo(''); setPaso('subir') }}
                  className="ml-3 text-primary hover:underline">Cambiar archivo</button>
              </p>

              {/* Tabla de preview */}
              <div className="rounded-xl border border-border overflow-hidden">
                <div className="bg-background-subtle px-4 py-2 border-b border-border">
                  <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-widest">
                    Mostrando {Math.min(contactos.length, 50)} de {contactos.length} registros
                  </p>
                </div>
                <div className="overflow-x-auto max-h-64">
                  <table className="w-full text-left">
                    <thead className="sticky top-0 bg-background-subtle border-b border-border">
                      <tr className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider">
                        <th className="px-4 py-2">Estado</th>
                        <th className="px-4 py-2">Nombre</th>
                        <th className="px-4 py-2">Email</th>
                        <th className="px-4 py-2">WhatsApp</th>
                        <th className="px-4 py-2"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border text-xs">
                      {contactos.slice(0, 50).map((c, i) => (
                        <tr key={i} className={cn('transition-colors', c.valido ? 'hover:bg-background-subtle/30' : 'bg-red-50/50')}>
                          <td className="px-4 py-2">
                            {c.valido
                              ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              : <span className="flex items-center gap-1 text-red-600"><AlertCircle className="w-4 h-4" />{c.error}</span>
                            }
                          </td>
                          <td className="px-4 py-2 text-foreground">{c.nombre || <span className="text-foreground-muted italic">—</span>}</td>
                          <td className="px-4 py-2 text-foreground font-medium">{c.email}</td>
                          <td className="px-4 py-2 text-foreground-muted">{c.whatsapp || '—'}</td>
                          <td className="px-4 py-2">
                            <button onClick={() => eliminarContacto(i)} className="text-foreground-muted/40 hover:text-red-500 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {invalidos.length > 0 && (
                <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-100 px-4 py-3">
                  <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">
                    {invalidos.length} contacto(s) con email inválido serán ignorados. Solo se importarán los {validos.length} válidos.
                  </p>
                </div>
              )}

              <button
                onClick={confirmarImportar}
                disabled={guardando || validos.length === 0}
                className="flex items-center justify-center gap-2 h-11 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 disabled:opacity-60 transition-all"
              >
                {guardando
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Importando...</>
                  : <><CheckCircle2 className="w-4 h-4" /> Importar {validos.length} contactos</>}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
