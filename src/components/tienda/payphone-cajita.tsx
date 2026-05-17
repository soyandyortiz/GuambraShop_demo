'use client'

import { useEffect, useRef } from 'react'

interface Props {
  token: string
  clientTransactionId: string
  amount: number          // en centavos
  storeId?: string | null
  reference?: string
  responseUrl: string
  cancellationUrl: string
}

declare global {
  interface Window {
    PPaymentButtonBox: new (config: Record<string, unknown>) => { render: (id: string) => void }
  }
}

const CONTAINER_ID = 'pp-cajita-container'

export function PayphoneCajita({ token, clientTransactionId, amount, storeId, reference, responseUrl, cancellationUrl }: Props) {
  const mounted = useRef(false)

  useEffect(() => {
    if (mounted.current) return
    mounted.current = true

    // CSS
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://cdn.payphonetodoesposible.com/box/v2.0/payphone-payment-box.css'
    document.head.appendChild(link)

    // JS SDK
    const script = document.createElement('script')
    script.src = 'https://cdn.payphonetodoesposible.com/box/v2.0/payphone-payment-box.js'
    script.async = true
    script.onload = () => {
      if (!window.PPaymentButtonBox) return
      new window.PPaymentButtonBox({
        token,
        clientTransactionId,
        amount,
        amountWithoutTax: amount,
        amountWithTax:    0,
        tax:              0,
        service:          0,
        tip:              0,
        currency:         'USD',
        reference:        reference ?? 'Pedido',
        ...(storeId ? { storeId } : {}),
        responseUrl,
        cancellationUrl,
      }).render(CONTAINER_ID)
    }
    document.body.appendChild(script)

    return () => {
      if (document.head.contains(link))   document.head.removeChild(link)
      if (document.body.contains(script)) document.body.removeChild(script)
    }
  }, [])

  return (
    <div className="w-full flex justify-center">
      <div id={CONTAINER_ID} className="w-full max-w-sm" />
    </div>
  )
}
