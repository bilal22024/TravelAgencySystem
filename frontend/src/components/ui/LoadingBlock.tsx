type LoadingBlockProps = {
  label?: string
  compact?: boolean
}

export function LoadingBlock({ label = 'Loading live data...', compact = false }: LoadingBlockProps) {
  return (
    <div className={`rounded-[24px] border border-white/10 bg-white/[0.045] shadow-panel backdrop-blur ${compact ? 'p-4' : 'p-5'}`}>
      <div className="grid gap-4">
        <div className="h-4 w-32 animate-pulse rounded-full bg-white/10" />
        <div className={`grid gap-3 ${compact ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}`}>
          <div className={`animate-pulse rounded-[20px] bg-white/5 ${compact ? 'h-16' : 'h-20'}`} />
          <div className={`animate-pulse rounded-[20px] bg-white/5 ${compact ? 'h-16' : 'h-20'}`} />
          {!compact ? <div className="h-20 animate-pulse rounded-[20px] bg-white/5" /> : null}
        </div>
        <div className={`animate-pulse rounded-[22px] bg-white/5 ${compact ? 'h-24' : 'h-36'}`} />
        <p className="text-sm text-slate-400">{label}</p>
      </div>
    </div>
  )
}
