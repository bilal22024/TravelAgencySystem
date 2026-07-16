import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/features/auth/store/useAuthStore'

export function PublicOnlyRoute() {
  const token = useAuthStore((state) => state.token)

  if (token) {
    return <Navigate replace to="/" />
  }

  return <Outlet />
}
