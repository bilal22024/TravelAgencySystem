type BarChartDatum = {
  label: string
  value: number
  secondaryValue?: number
}

type BarChartCardProps = {
  title: string
  description: string
  data: BarChartDatum[]
  valuePrefix?: string
}

export function BarChartCard({
  title,
  description,
  data,
  valuePrefix = '',
}: BarChartCardProps) {
  const maxValue = Math.max(...data.map((item) => item.value), 1)

  return (
    <div className="rounded-[28px] border border-white/10 bg-white/[0.045] p-6 shadow-panel backdrop-blur">
      <h2 className="font-display text-xl text-white">{title}</h2>
      <p className="mt-2 text-sm text-slate-300">{description}</p>

      <div className="mt-6 space-y-4">
        {data.map((item) => (
          <div key={item.label}>
            <div className="mb-2 flex items-center justify-between gap-4 text-sm">
              <span className="text-white">{item.label}</span>
              <span className="text-slate-300">
                {valuePrefix}
                {item.value.toFixed(2)}
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-emerald-300"
                style={{ width: `${Math.max((item.value / maxValue) * 100, 4)}%` }}
              />
            </div>
            {typeof item.secondaryValue === 'number' ? (
              <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-400">
                Secondary value: {valuePrefix}
                {item.secondaryValue.toFixed(2)}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  )
}
