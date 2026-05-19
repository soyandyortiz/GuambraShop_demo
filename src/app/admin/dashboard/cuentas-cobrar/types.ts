export interface CuotaCC {
  id: string
  numero_cuota: number
  monto: number
  fecha_vencimiento: string
  fecha_pago: string | null
  estado: string
}

export interface PedidoCC {
  id: string
  numero_orden: string
  nombres: string
  credito_cuotas: number
  credito_frecuencia: string
  credito_total: number
  credito_monto_cuota: number
  credito_saldo_pendiente: number
  creado_en: string
  cuotas_credito: CuotaCC[]
}
