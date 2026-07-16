import {
  Building2,
  CreditCard,
  FileBarChart2,
  Landmark,
  Receipt,
  ShieldCheck,
  Users,
  Wallet,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { MetricCard } from '@/components/layout/MetricCard'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingBlock } from '@/components/ui/LoadingBlock'
import { Panel } from '@/components/ui/Panel'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useGroupsQuery } from '@/features/groups/api'
import { usePaymentsQuery } from '@/features/payments/api'
import { useOutstandingBalanceReportQuery } from '@/features/reports/api'
import { formatCurrency, formatDate, formatNumber } from '@/lib/format'
import type { OutstandingBalancePaymentStatus } from '@/types/api'

function getStatusTone(status: OutstandingBalancePaymentStatus) {
  switch (status) {
    case 'FULLY_PAID':
      return 'success' as const
    case 'PARTIALLY_PAID':
      return 'warning' as const
    case 'UNPAID':
      return 'danger' as const
  }
}

function getTodayRange() {
  const now = new Date()
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)

  const end = new Date(now)
  end.setHours(23, 59, 59, 999)

  return {
    from: start.toISOString(),
    to: end.toISOString(),
  }
}

export function DashboardPage() {
  const todayRange = getTodayRange()

  const outstandingReportQuery = useOutstandingBalanceReportQuery({
    sortBy: 'outstandingBalance',
    sortOrder: 'desc',
  })
  const recentPaymentsQuery = usePaymentsQuery({
    page: 1,
    pageSize: 8,
    sortBy: 'paidAt',
    sortOrder: 'desc',
  })
  const todaysCollectionQuery = usePaymentsQuery({
    page: 1,
    pageSize: 500,
    paidAtFrom: todayRange.from,
    paidAtTo: todayRange.to,
    sortBy: 'paidAt',
    sortOrder: 'desc',
  })
  const recentGroupsQuery = useGroupsQuery({
    page: 1,
    pageSize: 8,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  })

  if (
    outstandingReportQuery.isLoading ||
    recentPaymentsQuery.isLoading ||
    todaysCollectionQuery.isLoading ||
    recentGroupsQuery.isLoading
  ) {
    return <LoadingBlock label="Loading the business dashboard..." />
  }

  if (
    outstandingReportQuery.isError ||
    recentPaymentsQuery.isError ||
    todaysCollectionQuery.isError ||
    recentGroupsQuery.isError ||
    !outstandingReportQuery.data
  ) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="Dashboard data is not available right now"
        description="One or more business dashboard sections could not be loaded from the current APIs."
      />
    )
  }

  const outstandingReport = outstandingReportQuery.data
  const recentPayments = recentPaymentsQuery.data?.data ?? []
  const todaysPayments = todaysCollectionQuery.data?.data ?? []
  const recentGroups = recentGroupsQuery.data?.data ?? []

  const totalAgencies =
    outstandingReport.summary.totalFullyPaidAgencies +
    outstandingReport.summary.totalPartiallyPaidAgencies +
    outstandingReport.summary.totalUnpaidAgencies

  const businessSummary = outstandingReport.rows.reduce(
    (bucket, row) => {
      bucket.totalGroups += row.totalGroups
      bucket.totalPassengers += row.totalPax
      bucket.totalReceivable += row.totalAmount
      bucket.totalReceived += row.totalAmountPaid
      return bucket
    },
    {
      totalGroups: 0,
      totalPassengers: 0,
      totalReceivable: 0,
      totalReceived: 0,
    },
  )

  const todaysCollection = todaysPayments.reduce((total, payment) => {
    return total + Number(payment.amount)
  }, 0)

  const outstandingAgencies = outstandingReport.rows
    .filter((row) => row.outstandingBalance > 0)
    .slice(0, 6)

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Dashboard"
        title="Business dashboard for agency operations and finance"
        description="Track agencies, groups, collections, outstanding balances, and recent activity from one finance-focused workspace."
      />

      <Panel
        title="Business Summary"
        description="High-level business volume across agencies and groups."
      >
        <div className="grid gap-4 xl:grid-cols-3">
          <MetricCard
            title="Total Agencies"
            value={formatNumber(totalAgencies)}
            detail="Agencies visible in the current business scope."
            icon={Building2}
          />
          <MetricCard
            title="Total Groups"
            value={formatNumber(businessSummary.totalGroups)}
            detail="Groups currently contributing to reports and balances."
            icon={Users}
            accentClassName="bg-amber-400/15 text-amber-100"
          />
          <MetricCard
            title="Total Passengers"
            value={formatNumber(businessSummary.totalPassengers)}
            detail="Passenger volume across all visible agencies."
            icon={Landmark}
            accentClassName="bg-emerald-400/15 text-emerald-100"
          />
        </div>
      </Panel>

      <Panel
        title="Financial Summary"
        description="Amounts are displayed from the current live data without changing existing calculations."
      >
        <div className="grid gap-4 xl:grid-cols-4">
          <MetricCard
            title="Total Receivable"
            value={formatCurrency(businessSummary.totalReceivable)}
            detail="Total group value currently visible in the system."
            icon={Receipt}
          />
          <MetricCard
            title="Total Received"
            value={formatCurrency(businessSummary.totalReceived)}
            detail="Total amount received from visible agencies."
            icon={CreditCard}
            accentClassName="bg-emerald-400/15 text-emerald-100"
          />
          <MetricCard
            title="Outstanding Balance"
            value={formatCurrency(outstandingReport.summary.totalOutstandingAmount)}
            detail="Current unpaid balance requiring follow-up."
            icon={Wallet}
            accentClassName="bg-rose-400/15 text-rose-100"
          />
          <MetricCard
            title="Today's Collection"
            value={formatCurrency(todaysCollection)}
            detail="Payments recorded today in the current scope."
            icon={Landmark}
            accentClassName="bg-cyan-400/15 text-cyan-100"
          />
        </div>
      </Panel>

      <Panel
        title="Agency Status"
        description="Agency payment position based on the existing outstanding balance report."
      >
        <div className="grid gap-4 xl:grid-cols-3">
          <MetricCard
            title="Fully Paid"
            value={formatNumber(outstandingReport.summary.totalFullyPaidAgencies)}
            detail="Agencies with no visible outstanding balance."
            icon={ShieldCheck}
            accentClassName="bg-emerald-400/15 text-emerald-100"
          />
          <MetricCard
            title="Partially Paid"
            value={formatNumber(outstandingReport.summary.totalPartiallyPaidAgencies)}
            detail="Agencies with both payments and remaining balance."
            icon={CreditCard}
            accentClassName="bg-amber-400/15 text-amber-100"
          />
          <MetricCard
            title="Unpaid"
            value={formatNumber(outstandingReport.summary.totalUnpaidAgencies)}
            detail="Agencies with open balances and no visible payment coverage."
            icon={Wallet}
            accentClassName="bg-rose-400/15 text-rose-100"
          />
        </div>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-[1.05fr,0.95fr]">
        <Panel
          title="Recent Payments"
          description="Latest recorded payments for quick finance review."
          action={
            <Link
              className="text-sm font-semibold text-cyan-200 transition hover:text-cyan-100"
              to="/payments"
            >
              View all payments
            </Link>
          }
        >
          {recentPayments.length === 0 ? (
            <EmptyState
              icon={CreditCard}
              title="No recent payments"
              description="Payments will appear here as soon as they are recorded."
            />
          ) : (
            <div className="space-y-3">
              {recentPayments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex flex-col gap-3 rounded-[22px] border border-white/10 bg-white/[0.04] px-4 py-4 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {payment.agency?.name ?? 'Unknown agency'}
                    </p>
                    <p className="mt-1 text-sm text-slate-300">
                      Ref {payment.reference}
                      {payment.paymentCity ? ` • ${payment.paymentCity}` : ''}
                      {' • '}
                      {payment.paidAt ? formatDate(payment.paidAt) : formatDate(payment.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-semibold text-white">
                        {formatCurrency(Number(payment.amount), payment.currency)}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">
                        {payment.method.replace(/_/g, ' ')}
                      </p>
                    </div>
                    <StatusBadge
                      label={payment.status.replace(/_/g, ' ')}
                      tone={
                        payment.status === 'ALLOCATED'
                          ? 'success'
                          : payment.status === 'PARTIALLY_ALLOCATED'
                            ? 'warning'
                            : 'neutral'
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel
          title="Outstanding Agencies"
          description="Agencies with the highest current outstanding balances."
          action={
            <Link
              className="text-sm font-semibold text-cyan-200 transition hover:text-cyan-100"
              to="/reports/outstanding-balances"
            >
              View outstanding report
            </Link>
          }
        >
          {outstandingAgencies.length === 0 ? (
            <EmptyState
              icon={Wallet}
              title="No outstanding agencies"
              description="All visible agencies are currently fully paid."
            />
          ) : (
            <div className="space-y-3">
              {outstandingAgencies.map((agency) => (
                <div
                  key={agency.agencyId}
                  className="flex flex-col gap-3 rounded-[22px] border border-white/10 bg-white/[0.04] px-4 py-4 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold text-white">{agency.agencyName}</p>
                    <p className="mt-1 text-sm text-slate-300">
                      {agency.country} • {agency.city} • Agent {agency.agentNumber}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-semibold text-white">
                        {formatCurrency(agency.outstandingBalance)}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">
                        Paid {formatCurrency(agency.totalAmountPaid)}
                      </p>
                    </div>
                    <StatusBadge
                      label={agency.paymentStatusLabel}
                      tone={getStatusTone(agency.paymentStatus)}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr,1.05fr]">
        <Panel
          title="Recently Added Groups"
          description="Latest groups added to the system."
          action={
            <Link
              className="text-sm font-semibold text-cyan-200 transition hover:text-cyan-100"
              to="/groups"
            >
              View group list
            </Link>
          }
        >
          {recentGroups.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No groups available"
              description="Newly added groups will appear here when they are created."
            />
          ) : (
            <div className="space-y-3">
              {recentGroups.map((group) => (
                <div
                  key={group.id}
                  className="flex flex-col gap-3 rounded-[22px] border border-white/10 bg-white/[0.04] px-4 py-4 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {group.code} • {group.name}
                    </p>
                    <p className="mt-1 text-sm text-slate-300">
                      {group.agency?.name ?? 'Unknown agency'} • {formatDate(group.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-semibold text-white">
                        {formatCurrency(Number(group.totalAmount ?? 0))}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">
                        {formatNumber(group.travelerCount)} passengers
                      </p>
                    </div>
                    <StatusBadge
                      label={group.paymentStatusLabel ?? 'Unpaid'}
                      tone={
                        group.paymentStatus === 'FULLY_PAID'
                          ? 'success'
                          : group.paymentStatus === 'PARTIALLY_PAID'
                            ? 'warning'
                            : 'danger'
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel
          title="Quick Actions"
          description="Open the most common daily actions used by finance and operations staff."
        >
          <div className="grid gap-3 md:grid-cols-2">
            {[
              {
                title: 'Add Agency',
                description: 'Open the agency workspace to register a new agency.',
                href: '/agencies',
                icon: Building2,
              },
              {
                title: 'Add Groups',
                description: 'Create new groups using the dedicated entry page.',
                href: '/groups/add',
                icon: Users,
              },
              {
                title: 'Record Payment',
                description: 'Open the payment screen to record a new receipt.',
                href: '/payments',
                icon: CreditCard,
              },
              {
                title: 'Agency Report',
                description: 'Review agency-level financial detail and payment history.',
                href: '/reports/agency',
                icon: FileBarChart2,
              },
              {
                title: 'Outstanding Report',
                description: 'Review agencies with open balances and follow-up needs.',
                href: '/reports/outstanding-balances',
                icon: Wallet,
              },
            ].map((item) => (
              <Link
                key={item.title}
                className="flex items-start gap-4 rounded-[24px] border border-white/10 bg-white/[0.04] px-4 py-4 transition hover:bg-white/[0.08]"
                to={item.href}
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-100">
                  <item.icon className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-white">{item.title}</span>
                  <span className="mt-1 block text-sm text-slate-300">{item.description}</span>
                </span>
              </Link>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  )
}
