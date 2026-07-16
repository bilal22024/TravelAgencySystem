import type { PropsWithChildren } from 'react'

type PageSectionProps = PropsWithChildren<{
  title: string
  description: string
}>

export function PageSection({ children, title, description }: PageSectionProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-panel">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
        <p className="mt-1 text-sm text-slate-600">{description}</p>
      </div>
      {children}
    </section>
  )
}
