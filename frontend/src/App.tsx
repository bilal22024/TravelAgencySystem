import { AppProviders } from '@/app/AppProviders'
import { AppRoutes } from '@/routes'

export default function App() {
  return (
    <AppProviders>
      <AppRoutes />
    </AppProviders>
  )
}
