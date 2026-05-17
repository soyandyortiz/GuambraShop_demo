'use client'

import { useEffect } from 'react'

interface Props {
  numeroOrden: string
  total: number
  moneda: string
  items: { nombre: string; cantidad: number; subtotal: number }[]
}

export function EventoCompra({ numeroOrden, total, moneda, items }: Props) {
  useEffect(() => {
    const w = window as any
    if (typeof w.gtag === 'function') {
      w.gtag('event', 'purchase', {
        transaction_id: numeroOrden,
        value: total,
        currency: moneda,
        items: items.map((it, i) => ({
          item_id: `item_${i}`,
          item_name: it.nombre,
          quantity: it.cantidad,
          price: it.subtotal / (it.cantidad || 1),
        })),
      })
    }
    if (typeof w.fbq === 'function') {
      w.fbq('track', 'Purchase', { value: total, currency: moneda })
    }
  }, [numeroOrden, total, moneda, items])

  return null
}
