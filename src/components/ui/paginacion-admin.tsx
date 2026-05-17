'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  total: number
  porPagina: number
  pagina: number
  onPaginar: (p: number) => void
}

export function PaginacionAdmin({ total, porPagina, pagina, onPaginar }: Props) {
  const totalPaginas = Math.ceil(total / porPagina)
  if (totalPaginas <= 1) return null

  const desde = (pagina - 1) * porPagina + 1
  const hasta  = Math.min(pagina * porPagina, total)

  return (
    <div className="flex items-center justify-between gap-4 pt-3 border-t border-border mt-2">
      <p className="text-xs text-foreground-muted">
        Mostrando <strong className="text-foreground">{desde}–{hasta}</strong> de <strong className="text-foreground">{total}</strong>
      </p>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPaginar(pagina - 1)}
          disabled={pagina === 1}
          className="h-8 w-8 flex items-center justify-center rounded-lg border border-border text-foreground-muted disabled:opacity-30 hover:bg-background-subtle hover:text-foreground transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-xs font-semibold text-foreground px-2">
          {pagina} / {totalPaginas}
        </span>
        <button
          onClick={() => onPaginar(pagina + 1)}
          disabled={pagina >= totalPaginas}
          className="h-8 w-8 flex items-center justify-center rounded-lg border border-border text-foreground-muted disabled:opacity-30 hover:bg-background-subtle hover:text-foreground transition-all"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
