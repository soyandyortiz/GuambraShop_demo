'use client'

import { useState } from 'react'

interface Punto {
  x: number
  y: number
  label: string
  valor: number
}

interface Props {
  datos: { label: string; valor: number }[]
  simbolo?: string
}

export function GraficoArea({ datos, simbolo = '$' }: Props) {
  const [hover, setHover] = useState<number | null>(null)

  if (datos.length === 0) return null

  const W = 600
  const H = 180
  const PAD = { top: 24, right: 12, bottom: 32, left: 52 }
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom

  const maxVal = Math.max(...datos.map(d => d.valor), 0.01)

  const points: Punto[] = datos.map((d, i) => ({
    x: PAD.left + (datos.length === 1 ? innerW / 2 : (i / (datos.length - 1)) * innerW),
    y: PAD.top + innerH - (d.valor / maxVal) * innerH,
    ...d,
  }))

  const linePath = points.length < 2
    ? ''
    : points.reduce((acc, p, i) => {
        if (i === 0) return `M ${p.x.toFixed(1)} ${p.y.toFixed(1)}`
        const prev = points[i - 1]
        const cpx = ((prev.x + p.x) / 2).toFixed(1)
        return `${acc} C ${cpx} ${prev.y.toFixed(1)} ${cpx} ${p.y.toFixed(1)} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`
      }, '')

  const areaPath = linePath
    ? `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${(PAD.top + innerH).toFixed(1)} L ${points[0].x.toFixed(1)} ${(PAD.top + innerH).toFixed(1)} Z`
    : ''

  const ySteps = 4
  const yLabels = Array.from({ length: ySteps + 1 }, (_, i) => ({
    y: PAD.top + (i / ySteps) * innerH,
    val: maxVal * (1 - i / ySteps),
  }))

  const maxXLabels = 8
  const step = Math.ceil(datos.length / maxXLabels)

  return (
    <div className="relative w-full select-none">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" style={{ touchAction: 'none' }}>
        <defs>
          <linearGradient id="areaGradShared" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="var(--primary)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Grid horizontal */}
        {yLabels.map((l, i) => (
          <g key={i}>
            <line
              x1={PAD.left} y1={l.y.toFixed(1)}
              x2={W - PAD.right} y2={l.y.toFixed(1)}
              stroke="currentColor" strokeOpacity="0.07" strokeWidth="1"
            />
            <text x={PAD.left - 6} y={(l.y + 4).toFixed(1)}
              textAnchor="end" fontSize="10" fill="currentColor" fillOpacity="0.45"
            >
              {l.val >= 1000 ? `${(l.val / 1000).toFixed(1)}k` : l.val.toFixed(0)}
            </text>
          </g>
        ))}

        {areaPath && <path d={areaPath} fill="url(#areaGradShared)" />}
        {linePath && (
          <path d={linePath} fill="none"
            stroke="var(--primary)" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round"
          />
        )}

        {points.map((p, i) => (
          <g key={i}>
            <rect
              x={(p.x - (innerW / datos.length) / 2).toFixed(1)}
              y={PAD.top}
              width={(innerW / datos.length).toFixed(1)}
              height={innerH}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              style={{ cursor: 'default' }}
            />
            {hover === i && (
              <line
                x1={p.x.toFixed(1)} y1={PAD.top}
                x2={p.x.toFixed(1)} y2={(PAD.top + innerH).toFixed(1)}
                stroke="var(--primary)" strokeOpacity="0.25" strokeWidth="1" strokeDasharray="3 3"
              />
            )}
            {p.valor > 0 && (
              <>
                <circle cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r="4"
                  fill="white" stroke="var(--primary)" strokeWidth="2"
                  opacity={hover === i ? 1 : 0.6}
                />
                {hover === i && (
                  <g>
                    <rect
                      x={(p.x - 42).toFixed(1)} y={(p.y - 34).toFixed(1)}
                      width="84" height="26" rx="6"
                      fill="#111827"
                    />
                    <text
                      x={p.x.toFixed(1)} y={(p.y - 17).toFixed(1)}
                      textAnchor="middle" fontSize="11" fontWeight="700" fill="white"
                    >
                      {simbolo}{Number(p.valor).toFixed(2)}
                    </text>
                  </g>
                )}
              </>
            )}
            {i % step === 0 && (
              <text
                x={p.x.toFixed(1)} y={(H - 6).toFixed(1)}
                textAnchor="middle" fontSize="9" fill="currentColor" fillOpacity="0.45"
              >
                {p.label}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  )
}
