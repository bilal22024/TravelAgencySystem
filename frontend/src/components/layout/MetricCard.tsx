import type { LucideIcon } from 'lucide-react'

type MetricCardProps = {
  title: string
  value: string
  detail: string
  icon: LucideIcon
  accentClassName?: string
}

export function MetricCard({
  title,
  value,
  detail,
  icon: Icon,
  accentClassName = 'bg-cyan-400/10 text-cyan-100',
}: MetricCardProps) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-white/[0.05] p-5 shadow-panel backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/[0.07]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
            {title}
          </p>
          <p className="mt-4 font-display text-3xl text-white">{value}</p>
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${accentClassName}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-4 text-sm text-slate-300">{detail}</p>
    </div>
  )
}
