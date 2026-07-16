type LineChartDatum = {
  label: string
  value: number
}

type LineChartCardProps = {
  title: string
  description: string
  data: LineChartDatum[]
  accentClassName?: string
}

export function LineChartCard({
  title,
  description,
  data,
  accentClassName = 'stroke-cyan-300 fill-cyan-300/15',
}: LineChartCardProps) {
  const maxValue = Math.max(...data.map((item) => item.value), 1)
  const points = data
    .map((item, index) => {
      const x = (index / Math.max(data.length - 1, 1)) * 100
      const y = 90 - (item.value / maxValue) * 70
      return `${x},${y}`
    })
    .join(' ')

  return (
    <div className="rounded-[28px] border border-white/10 bg-white/[0.045] p-6 shadow-panel backdrop-blur">
      <h2 className="font-display text-xl text-white">{title}</h2>
      <p className="mt-2 text-sm text-slate-300">{description}</p>

      <div className="mt-6 rounded-[24px] border border-white/10 bg-[rgba(7,15,27,0.45)] p-4">
        <svg viewBox="0 0 100 100" className="h-56 w-full">
          <polyline
            points={points}
            className={`${accentClassName}`}
            fill="none"
            strokeWidth="2.5"
            vectorEffect="non-scaling-stroke"
          />
          {data.map((item, index) => {
            const x = (index / Math.max(data.length - 1, 1)) * 100
            const y = 90 - (item.value / maxValue) * 70

            return <circle key={item.label} cx={x} cy={y} r="1.8" className="fill-cyan-200" />
          })}
        </svg>

        <div className="mt-4 grid grid-cols-4 gap-2 text-xs text-slate-400">
          {data.map((item) => (
            <div key={item.label} className="truncate text-center">
              {item.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
