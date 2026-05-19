export interface AbonoDetalle {
  id: string
  monto: number
  notas: string | null
  creado_en: string
  cuota_id: string | null
}

export interface CuotaDetalle {
  id: string
  numero_cuota: number
  monto: number
  fecha_vencimiento: string
  fecha_pago: string | null
  estado: string
}

export interface PedidoDetalle {
  id: string
  numero_orden: string
  nombres: string
  credito_cuotas: number
  credito_frecuencia: string
  credito_tasa: number
  credito_total: number
  credito_monto_cuota: number
  credito_saldo_pendiente: number
  creado_en: string
}
