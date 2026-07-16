import { ShieldCheck, TrendingUp, WalletCards } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { LoginForm } from '@/features/auth/components/LoginForm'
import { getFrontendEnvironment } from '@/lib/env'

const environment = getFrontendEnvironment()

export function LoginPage() {
  const navigate = useNavigate()

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-[var(--app-bg)] px-4 py-6 text-slate-100 sm:px-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.15),transparent_30%)]" />
      <div className="relative mx-auto grid w-full max-w-7xl gap-6 lg:grid-cols-[1.1fr,0.9fr]">
        <section className="rounded-[36px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,17,30,0.92),rgba(7,14,24,0.84))] p-8 shadow-panel backdrop-blur sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-cyan-200">
            {environment.appName}
          </p>
          <h1 className="mt-6 max-w-2xl font-display text-4xl leading-tight text-white sm:text-5xl">
            Refined control for agencies, departures, and financial flow.
          </h1>
          <p className="mt-5 max-w-xl text-base text-slate-300">
            This desktop-first control room connects the travel operations backend to a focused
            admin interface for leadership, finance, and field teams.
          </p>

          <div className="mt-10 grid gap-4">
            {[
              {
                title: 'Operational visibility',
                description: 'Track agencies, group schedules, and payment progress in one place.',
                icon: ShieldCheck,
              },
              {
                title: 'Decision-friendly summaries',
                description: 'Use live KPIs and report cards built from the Phase 3 API.',
                icon: TrendingUp,
              },
              {
                title: 'Modern internal workflow',
                description: 'A polished control-room aesthetic tuned for day-to-day admin work.',
                icon: WalletCards,
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-100">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{item.title}</p>
                    <p className="mt-1 text-sm text-slate-300">{item.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="flex items-center">
          <div className="w-full rounded-[36px] border border-white/10 bg-[linear-gradient(180deg,rgba(12,23,40,0.88),rgba(10,17,30,0.92))] p-8 shadow-panel backdrop-blur sm:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-emerald-200">
              Secure sign in
            </p>
            <h2 className="mt-4 font-display text-3xl text-white">Enter the admin dashboard</h2>
            <p className="mt-3 text-sm text-slate-300">
              Sign in with your existing API credentials. Authenticated users will be redirected
              into the protected control room immediately.
            </p>

            <div className="mt-8">
              <LoginForm onSuccess={() => navigate('/')} />
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
