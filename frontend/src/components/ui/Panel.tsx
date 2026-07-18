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
        'rounded-[24px] border border-white/10 bg-white/[0.045] p-4 shadow-panel backdrop-blur sm:p-5',
        className,
      )}
    >
      {(title || description || action) && (
        <header className="mb-4 flex flex-col gap-3 border-b border-white/8 pb-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            {title ? <h2 className="text-lg font-semibold text-white">{title}</h2> : null}
            {description ? <p className="mt-1 text-sm leading-6 text-slate-300">{description}</p> : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </header>
      )}
      {children}
    </section>
  )
}
