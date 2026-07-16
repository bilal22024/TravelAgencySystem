import type { ReactNode } from 'react'

type PageHeaderProps = {
  eyebrow?: string
  title: string
  description: string
  action?: ReactNode
}

export function PageHeader({ eyebrow, title, description, action }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-3 font-display text-3xl text-white sm:text-4xl">{title}</h1>
        <p className="mt-3 max-w-3xl text-sm text-slate-300 sm:text-base">{description}</p>
      </div>
      {action}
    </div>
  )
}
