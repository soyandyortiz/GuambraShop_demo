'use client'

import Link from 'next/link'
import { Megaphone, Mail } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props { tabActivo: string }

const TABS = [
  { id: 'anuncios', label: 'Anuncios',       icono: <Megaphone className="w-4 h-4" />, href: '/admin/dashboard/promociones?tab=anuncios' },
  { id: 'email',    label: 'Email Marketing', icono: <Mail      className="w-4 h-4" />, href: '/admin/dashboard/promociones?tab=email'    },
]

export function TabsPromocion({ tabActivo }: Props) {
  return (
    <div className="flex items-center gap-1 p-1 rounded-xl bg-background-subtle border border-border w-fit">
      {TABS.map(tab => (
        <Link
          key={tab.id}
          href={tab.href}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all',
            tabActivo === tab.id
              ? 'bg-card text-foreground shadow-sm border border-border'
              : 'text-foreground-muted hover:text-foreground'
          )}
        >
          {tab.icono}
          {tab.label}
        </Link>
      ))}
    </div>
  )
}
