import { Route, Routes } from 'react-router-dom'
import { ProtectedApp } from '@/features/auth/components/ProtectedApp'
import { PublicOnlyRoute } from '@/features/auth/components/PublicOnlyRoute'
import { AgencyLedgerPage } from '@/pages/AgencyLedgerPage'
import { AgencyDetailsPage } from '@/pages/AgencyDetailsPage'
import { AgencyReportPage } from '@/pages/AgencyReportPage'
import { AgenciesPage } from '@/pages/AgenciesPage'
import { AddGroupsPage } from '@/pages/AddGroupsPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { GroupDetailsPage } from '@/pages/GroupDetailsPage'
import { GroupsPage } from '@/pages/GroupsPage'
import { OutstandingBalanceReportPage } from '@/pages/OutstandingBalanceReportPage'
import { LoginPage } from '@/pages/LoginPage'
import { PaymentsPage } from '@/pages/PaymentsPage'
import { ReportsPage } from '@/pages/ReportsPage'

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      <Route element={<ProtectedApp />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/agencies" element={<AgenciesPage />} />
        <Route path="/agencies/:id" element={<AgencyDetailsPage />} />
        <Route path="/groups/add" element={<AddGroupsPage />} />
        <Route path="/groups" element={<GroupsPage />} />
        <Route path="/groups/:id" element={<GroupDetailsPage />} />
        <Route path="/payments" element={<PaymentsPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/reports/agency" element={<AgencyReportPage />} />
        <Route path="/reports/agency-ledger" element={<AgencyLedgerPage />} />
        <Route path="/reports/outstanding-balances" element={<OutstandingBalanceReportPage />} />
      </Route>
    </Routes>
  )
}
