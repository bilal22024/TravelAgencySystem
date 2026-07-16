import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuthStore } from '@/features/auth/store/useAuthStore'
import { useCurrentUserQuery } from '@/features/auth/api'
import { getApiErrorMessage } from '@/lib/api-client'
import { AppShell } from '@/app/AppShell'

export function ProtectedApp() {
  const location = useLocation()
  const token = useAuthStore((state) => state.token)
  const updateUser = useAuthStore((state) => state.updateUser)
  const logout = useAuthStore((state) => state.logout)
  const currentUserQuery = useCurrentUserQuery()

  useEffect(() => {
    if (currentUserQuery.data) {
      updateUser(currentUserQuery.data)
    }
  }, [currentUserQuery.data, updateUser])

  useEffect(() => {
    if (currentUserQuery.isError) {
      logout()
    }
  }, [currentUserQuery.isError, logout])

  if (!token) {
    return <Navigate replace to="/login" state={{ from: location }} />
  }

  if (currentUserQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--app-bg)] px-6">
        <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-white/5 p-8 text-center shadow-panel backdrop-blur">
          <div className="mx-auto h-12 w-12 animate-pulse rounded-full bg-cyan-400/20" />
          <h1 className="mt-6 font-display text-2xl text-white">Syncing your workspace</h1>
          <p className="mt-3 text-sm text-slate-300">
            We are verifying your session and loading the control center.
          </p>
        </div>
      </div>
    )
  }

  if (currentUserQuery.isError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--app-bg)] px-6">
        <div className="w-full max-w-md rounded-[28px] border border-rose-400/30 bg-rose-500/10 p-8 text-center shadow-panel backdrop-blur">
          <h1 className="font-display text-2xl text-white">Session expired</h1>
          <p className="mt-3 text-sm text-rose-100">
            {getApiErrorMessage(currentUserQuery.error)}
          </p>
        </div>
      </div>
    )
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}
