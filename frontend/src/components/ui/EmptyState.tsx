import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

type EmptyStateProps = {
  icon: LucideIcon
  title: string
  description: string
  action?: ReactNode
  compact?: boolean
}

export function EmptyState({ icon: Icon, title, description, action, compact = false }: EmptyStateProps) {
  return (
    <div className={`rounded-[24px] border border-dashed border-white/10 bg-white/[0.03] text-center ${compact ? 'px-5 py-7' : 'px-6 py-9'}`}>
      <div className={`mx-auto flex items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-100 ${compact ? 'h-10 w-10' : 'h-12 w-12'}`}>
        <Icon className={compact ? 'h-5 w-5' : 'h-6 w-6'} />
      </div>
      <h3 className={`font-semibold text-white ${compact ? 'mt-3 text-base' : 'mt-4 text-lg'}`}>{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-300">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}
