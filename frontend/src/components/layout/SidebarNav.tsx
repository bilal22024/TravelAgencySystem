import { LogOut, PanelLeftClose, PanelLeftOpen, X } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { getInitials } from '@/lib/format'
import { navigationItems } from '@/lib/route-meta'
import { useAuthStore } from '@/features/auth/store/useAuthStore'
import { cn } from '@/lib/utils'

type SidebarNavProps = {
  collapsed: boolean
  mobileOpen: boolean
  onCloseMobile: () => void
  onToggle: () => void
}

export function SidebarNav({ collapsed, mobileOpen, onCloseMobile, onToggle }: SidebarNavProps) {
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)

  return (
    <>
      <button
        className={cn(
          'fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm transition xl:hidden',
          mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        type="button"
        tabIndex={mobileOpen ? 0 : -1}
        aria-label="Close navigation"
        onClick={onCloseMobile}
      />

      <aside
        className={cn(
          'fixed inset-y-3 left-3 z-50 flex w-[292px] max-w-[calc(100vw-24px)] flex-col rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,16,28,0.98),rgba(11,21,35,0.92))] p-3 shadow-panel backdrop-blur transition duration-200 xl:sticky xl:top-6 xl:z-auto xl:h-[calc(100vh-48px)]',
          mobileOpen ? 'translate-x-0' : '-translate-x-[110%] xl:translate-x-0',
          collapsed ? 'xl:w-[96px]' : 'xl:w-[260px]',
        )}
      >
        <div className="flex items-center justify-between gap-3 px-2 pb-5">
          <div className={cn('min-w-0 transition', collapsed && 'xl:hidden')}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-cyan-200">
              Travel Agency ERP
            </p>
            <h1 className="mt-2 truncate text-lg font-semibold text-white">Control Room</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10 xl:hidden"
              type="button"
              onClick={onCloseMobile}
              aria-label="Close navigation"
            >
              <X className="h-4 w-4" />
            </button>
            <button
              className="hidden h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10 xl:inline-flex"
              type="button"
              onClick={onToggle}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className={cn('px-2 pb-3', collapsed && 'xl:hidden')}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Workspace</p>
        </div>

        <nav className="grid gap-1.5">
          {navigationItems.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              end
              title={item.subtitle ?? item.title}
              onClick={onCloseMobile}
              className={({ isActive }) =>
                cn(
                  'group flex h-12 items-center gap-3 rounded-2xl border px-3 transition',
                  isActive
                    ? 'border-cyan-300/35 bg-cyan-400/10 text-white'
                    : 'border-transparent text-slate-300 hover:border-white/10 hover:bg-white/5 hover:text-white',
                )
              }
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/5">
              <item.icon className="h-4.5 w-4.5" />
            </span>
            <span
              className={cn(
                'min-w-0 truncate whitespace-nowrap text-sm font-semibold',
                collapsed && 'xl:hidden',
              )}
            >
              {item.title}
            </span>
          </NavLink>
          ))}
        </nav>

        <div className="mt-auto space-y-3 border-t border-white/10 pt-5">
          <div className="rounded-[22px] border border-white/10 bg-white/5 p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-400/15 font-semibold text-cyan-50">
                {user ? getInitials(user.firstName, user.lastName) : 'TA'}
              </div>
              <div className={cn('min-w-0', collapsed && 'xl:hidden')}>
                <p className="truncate text-sm font-semibold text-white">
                  {user ? `${user.firstName} ${user.lastName}` : 'Authenticated user'}
                </p>
                <p className="truncate text-xs uppercase tracking-[0.16em] text-slate-400">
                  {user?.role ?? 'Operations'}
                </p>
              </div>
            </div>
          </div>

          <button
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
            type="button"
            onClick={logout}
            title="Sign out"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span className={cn('whitespace-nowrap', collapsed && 'xl:hidden')}>Sign out</span>
          </button>
        </div>
      </aside>
    </>
  )
}
