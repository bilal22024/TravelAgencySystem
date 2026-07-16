import type { PropsWithChildren, ReactNode } from 'react'
import { cn } from '@/lib/utils'

type PanelProps = PropsWithChildren<{
  title?: string
  description?: string
  action?: ReactNode
  className?: string
}>

export function Panel({ children, title, description, action, className }: PanelProps) {
  return (
    <section
      className={cn(
        'rounded-[28px] border border-white/10 bg-white/[0.045] p-6 shadow-panel backdrop-blur',
        className,
      )}
    >
      {(title || description || action) && (
        <header className="mb-5 flex flex-col gap-3 border-b border-white/8 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            {title ? <h2 className="font-display text-xl text-white">{title}</h2> : null}
            {description ? <p className="mt-2 text-sm text-slate-300">{description}</p> : null}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  )
}
