import type { LucideIcon } from 'lucide-react'

type EmptyStateProps = {
  icon: LucideIcon
  title: string
  description: string
}

export function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.03] px-6 py-10 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-100">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="mt-4 font-display text-xl text-white">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-300">{description}</p>
    </div>
  )
}
