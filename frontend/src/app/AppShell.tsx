import { type ReactNode, useMemo, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Menu, Search } from 'lucide-react'
import { SidebarNav } from '@/components/layout/SidebarNav'
import { routeMetaByPath } from '@/lib/route-meta'
import { useAuthStore } from '@/features/auth/store/useAuthStore'

type AppShellProps = {
  children?: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const location = useLocation()
  const user = useAuthStore((state) => state.user)

  const routeMeta = useMemo(() => {
    if (location.pathname.startsWith('/agencies/')) {
      return {
        title: 'Agency Details',
        subtitle: 'Review hierarchy, profile details, branches, and the current finance snapshot',
      }
    }

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
    <div className="min-h-screen overflow-x-clip bg-[var(--app-bg)] text-slate-100">
      <div className="mx-auto grid min-h-screen max-w-[1480px] gap-4 px-3 py-3 sm:px-4 lg:gap-5 lg:px-5 lg:py-5 xl:grid-cols-[auto,minmax(0,1fr)] xl:gap-6 xl:px-6 xl:py-6">
        <SidebarNav
          collapsed={collapsed}
          mobileOpen={mobileNavOpen}
          onCloseMobile={() => setMobileNavOpen(false)}
          onToggle={() => setCollapsed((value) => !value)}
        />

        <div className="min-w-0 space-y-5">
          <header className="sticky top-3 z-30 rounded-[24px] border border-white/10 bg-[rgba(7,15,27,0.88)] px-4 py-3 shadow-panel backdrop-blur sm:px-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10 xl:hidden"
                  type="button"
                  onClick={() => setMobileNavOpen(true)}
                  aria-label="Open navigation"
                >
                  <Menu className="h-4 w-4" />
                </button>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-200">
                    Travel Agency ERP
                  </p>
                  <p className="truncate text-sm font-semibold text-white">{routeMeta.title}</p>
                </div>
              </div>

              <div className="flex flex-1 items-center justify-end gap-3">
                <div className="hidden min-w-[260px] max-w-[420px] flex-1 items-center gap-3 rounded-2xl border border-white/10 bg-[rgba(7,15,27,0.55)] px-4 py-3 text-slate-300 md:flex">
                  <Search className="h-4 w-4 shrink-0 text-slate-500" />
                  <span className="truncate text-sm text-slate-400">
                    Search agencies, groups, or payments
                  </span>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <p className="truncate text-sm font-semibold text-white">
                    {user ? `${user.firstName} ${user.lastName}` : 'Travel operator'}
                  </p>
                  <p className="truncate text-xs uppercase tracking-[0.18em] text-slate-400">
                    {user?.email ?? 'Connected to live API'}
                  </p>
                </div>
              </div>
            </div>
          </header>

          <main className="mx-auto w-full max-w-[1180px] min-w-0">{children ?? <Outlet />}</main>
        </div>
      </div>
    </div>
  )
}
