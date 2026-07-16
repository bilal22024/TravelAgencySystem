import { LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { getInitials } from '@/lib/format'
import { navigationItems } from '@/lib/route-meta'
import { useAuthStore } from '@/features/auth/store/useAuthStore'
import { cn } from '@/lib/utils'

type SidebarNavProps = {
  collapsed: boolean
  onToggle: () => void
}

export function SidebarNav({ collapsed, onToggle }: SidebarNavProps) {
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)

  return (
    <aside
      className={cn(
        'flex h-full flex-col rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,16,28,0.96),rgba(11,21,35,0.82))] p-4 shadow-panel backdrop-blur xl:sticky xl:top-6',
        collapsed ? 'xl:w-[104px]' : 'xl:w-[288px]',
      )}
    >
      <div className="flex items-center justify-between gap-3 px-2 pb-6">
        <div className={cn('transition', collapsed && 'xl:hidden')}>
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-cyan-200">
            Travel agency
          </p>
          <h1 className="mt-2 font-display text-2xl text-white">Control Room</h1>
        </div>
        <button
          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10"
          type="button"
          onClick={onToggle}
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>

      <nav className="grid gap-2">
        {navigationItems.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            end
            className={({ isActive }) =>
              cn(
                'group flex items-center gap-3 rounded-2xl border px-3 py-3 transition',
                isActive
                  ? 'border-cyan-300/35 bg-cyan-400/10 text-white'
                  : 'border-transparent text-slate-300 hover:border-white/10 hover:bg-white/5 hover:text-white',
              )
            }
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/5">
              <item.icon className="h-5 w-5" />
            </span>
            <span className={cn('min-w-0', collapsed && 'xl:hidden')}>
              <span className="block text-sm font-semibold">{item.title}</span>
              <span className="block truncate text-xs text-slate-400">{item.subtitle}</span>
            </span>
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto space-y-3 pt-6">
        <div className="rounded-[24px] border border-white/10 bg-white/5 p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/15 font-semibold text-cyan-50">
              {user ? getInitials(user.firstName, user.lastName) : 'TA'}
            </div>
            <div className={cn('min-w-0', collapsed && 'xl:hidden')}>
              <p className="truncate text-sm font-semibold text-white">
                {user ? `${user.firstName} ${user.lastName}` : 'Authenticated user'}
              </p>
              <p className="truncate text-xs uppercase tracking-[0.18em] text-slate-400">
                {user?.role ?? 'Operations'}
              </p>
            </div>
          </div>
        </div>

        <button
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
          type="button"
          onClick={logout}
        >
          <LogOut className="h-4 w-4" />
          <span className={cn(collapsed && 'xl:hidden')}>Sign out</span>
        </button>
      </div>
    </aside>
  )
}
