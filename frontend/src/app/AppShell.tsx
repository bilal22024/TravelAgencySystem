import { type ReactNode, useMemo, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Bell, Search } from 'lucide-react'
import { SidebarNav } from '@/components/layout/SidebarNav'
import { routeMetaByPath } from '@/lib/route-meta'
import { useAuthStore } from '@/features/auth/store/useAuthStore'

type AppShellProps = {
  children?: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()
  const user = useAuthStore((state) => state.user)

  const routeMeta = useMemo(() => {
    if (location.pathname.startsWith('/groups/') && location.pathname !== '/groups/add') {
      return {
        title: 'Group Details',
        subtitle: 'Review group information, payment history, and approved edits',
      }
    }

    return (
      routeMetaByPath.get(location.pathname) ?? {
        title: 'Dashboard',
        subtitle: 'Live operational overview',
      }
    )
  }, [location.pathname])

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-slate-100">
      <div className="mx-auto grid min-h-screen max-w-[1600px] gap-6 px-4 py-4 xl:grid-cols-[auto,1fr] xl:px-6 xl:py-6">
        <SidebarNav collapsed={collapsed} onToggle={() => setCollapsed((value) => !value)} />

        <div className="space-y-6">
          <header className="rounded-[32px] border border-white/10 bg-white/[0.05] px-5 py-4 shadow-panel backdrop-blur">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                {routeMeta.subtitle ? (
                  <>
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-200">
                      {routeMeta.title}
                    </p>
                    <h2 className="mt-2 font-display text-2xl text-white">{routeMeta.subtitle}</h2>
                  </>
                ) : (
                  <h1 className="font-display text-2xl text-white">{routeMeta.title}</h1>
                )}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[rgba(7,15,27,0.55)] px-4 py-3 text-slate-300">
                  <Search className="h-4 w-4 text-slate-500" />
                  <span className="text-sm text-slate-400">Search agencies, groups, or payments</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10"
                    type="button"
                  >
                    <Bell className="h-4 w-4" />
                  </button>
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    <p className="text-sm font-semibold text-white">
                      {user ? `${user.firstName} ${user.lastName}` : 'Travel operator'}
                    </p>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                      {user?.email ?? 'Connected to live API'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <main>{children ?? <Outlet />}</main>
        </div>
      </div>
    </div>
  )
}
