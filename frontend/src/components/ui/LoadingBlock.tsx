type LoadingBlockProps = {
  label?: string
}

export function LoadingBlock({ label = 'Loading live data...' }: LoadingBlockProps) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-white/[0.045] p-6 shadow-panel backdrop-blur">
      <div className="grid gap-4">
        <div className="h-5 w-36 animate-pulse rounded-full bg-white/10" />
        <div className="h-24 animate-pulse rounded-[24px] bg-white/5" />
        <p className="text-sm text-slate-400">{label}</p>
      </div>
    </div>
  )
}
