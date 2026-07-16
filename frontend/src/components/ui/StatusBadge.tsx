import { cn } from '@/lib/utils'

type StatusTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info'

type StatusBadgeProps = {
  label: string
  tone?: StatusTone
}

const toneClasses: Record<StatusTone, string> = {
  neutral: 'border-white/10 bg-white/5 text-slate-200',
  success: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-100',
  warning: 'border-amber-400/25 bg-amber-400/10 text-amber-100',
  danger: 'border-rose-400/25 bg-rose-400/10 text-rose-100',
  info: 'border-cyan-400/25 bg-cyan-400/10 text-cyan-100',
}

export function StatusBadge({ label, tone = 'neutral' }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em]',
        toneClasses[tone],
      )}
    >
      {label}
    </span>
  )
}
