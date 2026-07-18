import type { LucideIcon } from 'lucide-react'
import {
  ArrowRight,
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
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingBlock } from '@/components/ui/LoadingBlock'
import { Panel } from '@/components/ui/Panel'
import { usePaymentsQuery } from '@/features/payments/api'
import { useOutstandingBalanceReportQuery, useReportSummaryQuery } from '@/features/reports/api'
import { formatCurrency, formatNumber } from '@/lib/format'

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

function getCurrentMonth() {
  const now = new Date()

  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    label: new Intl.DateTimeFormat('en-US', { month: 'long' }).format(now),
  }
}

type DashboardMetricCardProps = {
  title: string
  value: string
  detail: string
  icon: LucideIcon
  accentClassName?: string
}

function DashboardMetricCard({
  title,
  value,
  detail,
  icon: Icon,
  accentClassName = 'bg-cyan-400/10 text-cyan-100',
}: DashboardMetricCardProps) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.045] px-4 py-4 shadow-panel">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
            {title}
          </p>
          <p className="mt-3 font-display text-2xl text-white">{value}</p>
        </div>
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${accentClassName}`}
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-3 text-sm text-slate-300">{detail}</p>
    </div>
  )
}

type SnapshotMetricCardProps = {
  label: string
  value: string
  detail: string
}

function SnapshotMetricCard({ label, value, detail }: SnapshotMetricCardProps) {
  return (
    <div className="rounded-[20px] border border-white/10 bg-white/[0.04] px-4 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="mt-2 font-display text-2xl text-white">{value}</p>
      <p className="mt-2 text-sm text-slate-300">{detail}</p>
    </div>
  )
}

type MiniTrendChartProps = {
  data: Array<{
    label: string
    value: number
  }>
}

function MiniTrendChart({ data }: MiniTrendChartProps) {
  const maxValue = Math.max(...data.map((item) => item.value), 1)
  const points = data
    .map((item, index) => {
      const x = (index / Math.max(data.length - 1, 1)) * 100
      const y = 85 - (item.value / maxValue) * 60
      return `${x},${y}`
    })
    .join(' ')

  return (
    <div className="rounded-[20px] border border-white/10 bg-[rgba(7,15,27,0.45)] px-4 py-4">
      <svg viewBox="0 0 100 90" className="h-36 w-full">
        <line x1="0" y1="85" x2="100" y2="85" className="stroke-white/10" strokeWidth="1" />
        <polyline
          points={points}
          className="fill-none stroke-cyan-300"
          strokeWidth="2.5"
          vectorEffect="non-scaling-stroke"
        />
        {data.map((item, index) => {
          const x = (index / Math.max(data.length - 1, 1)) * 100
          const y = 85 - (item.value / maxValue) * 60

          return <circle key={item.label} cx={x} cy={y} r="1.8" className="fill-cyan-200" />
        })}
      </svg>
      <div className="mt-3 grid grid-cols-6 gap-2 text-center text-[11px] uppercase tracking-[0.12em] text-slate-400 sm:grid-cols-12">
        {data.map((item) => (
          <span key={item.label} className="truncate">
            {item.label}
          </span>
        ))}
      </div>
    </div>
  )
}

export function DashboardPage() {
  const todayRange = getTodayRange()
  const currentMonth = getCurrentMonth()

  const outstandingReportQuery = useOutstandingBalanceReportQuery({
    sortBy: 'outstandingBalance',
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
  const monthlySummaryQuery = useReportSummaryQuery({
    year: currentMonth.year,
    month: currentMonth.month,
  })

  if (outstandingReportQuery.isLoading || todaysCollectionQuery.isLoading || monthlySummaryQuery.isLoading) {
    return <LoadingBlock label="Loading the business dashboard..." />
  }

  if (
    outstandingReportQuery.isError ||
    todaysCollectionQuery.isError ||
    monthlySummaryQuery.isError ||
    !outstandingReportQuery.data ||
    !monthlySummaryQuery.data
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
  const todaysPayments = todaysCollectionQuery.data?.data ?? []
  const monthlySummary = monthlySummaryQuery.data

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

  const summaryCards = [
    {
      title: 'Total Agencies',
      value: formatNumber(totalAgencies),
      detail: 'Agencies visible in the current finance scope.',
      icon: Building2,
    },
    {
      title: 'Total Groups',
      value: formatNumber(businessSummary.totalGroups),
      detail: 'Groups contributing to live balances and reporting.',
      icon: Users,
      accentClassName: 'bg-amber-400/15 text-amber-100',
    },
    {
      title: 'Total Pax',
      value: formatNumber(businessSummary.totalPassengers),
      detail: 'Passenger volume across all visible agencies.',
      icon: Landmark,
      accentClassName: 'bg-emerald-400/15 text-emerald-100',
    },
    {
      title: 'Payments Received',
      value: formatCurrency(businessSummary.totalReceived),
      detail: 'Total amount received without changing current calculations.',
      icon: CreditCard,
      accentClassName: 'bg-emerald-400/15 text-emerald-100',
    },
    {
      title: 'Outstanding Balance',
      value: formatCurrency(outstandingReport.summary.totalOutstandingAmount),
      detail: 'Current unpaid balance requiring agency follow-up.',
      icon: Wallet,
      accentClassName: 'bg-rose-400/15 text-rose-100',
    },
    {
      title: "Today's Collections",
      value: formatCurrency(todaysCollection),
      detail: 'Payments recorded today in the current scope.',
      icon: Receipt,
      accentClassName: 'bg-cyan-400/15 text-cyan-100',
    },
  ]

  const quickActions = [
    {
      title: 'Add Agency',
      description: 'Register a new agency or branch.',
      href: '/agencies',
      icon: Building2,
    },
    {
      title: 'Add Groups',
      description: 'Create new groups from the entry page.',
      href: '/groups/add',
      icon: Users,
    },
    {
      title: 'Record Payment',
      description: 'Capture a new receipt quickly.',
      href: '/payments',
      icon: CreditCard,
    },
    {
      title: 'Agency Report',
      description: 'Review agency finance details.',
      href: '/reports/agency',
      icon: FileBarChart2,
    },
    {
      title: 'Outstanding Report',
      description: 'Follow up unpaid agency balances.',
      href: '/reports/outstanding-balances',
      icon: Wallet,
    },
  ]

  const monthlyBusinessSummary = [
    {
      label: 'Total Groups',
      value: formatNumber(businessSummary.totalGroups),
      detail: 'Live groups in the current dashboard scope.',
    },
    {
      label: 'Total Pax',
      value: formatNumber(businessSummary.totalPassengers),
      detail: 'Live passenger volume across visible agencies.',
    },
    {
      label: 'Payments Received',
      value: formatCurrency(monthlySummary.totals.totalRevenue),
      detail: `${currentMonth.label} collections from the reporting summary.`,
    },
    {
      label: 'Outstanding Balance',
      value: formatCurrency(monthlySummary.totals.outstandingBalance),
      detail: `${currentMonth.label} unpaid balance from the reporting summary.`,
    },
  ]

  const countrySummary = Array.from(
    outstandingReport.rows.reduce<
      Map<
        string,
        {
          country: string
          totalGroups: number
          totalPax: number
          totalAmountPaid: number
          outstandingAmount: number
        }
      >
    >((bucket, row) => {
      const country = row.country || 'Unspecified'
      const countryBucket = bucket.get(country) ?? {
        country,
        totalGroups: 0,
        totalPax: 0,
        totalAmountPaid: 0,
        outstandingAmount: 0,
      }

      countryBucket.totalGroups += row.totalGroups
      countryBucket.totalPax += row.totalPax
      countryBucket.totalAmountPaid += row.totalAmountPaid
      countryBucket.outstandingAmount += row.outstandingBalance

      bucket.set(country, countryBucket)
      return bucket
    }, new Map()).values(),
  ).sort((left, right) => {
    return (
      right.totalAmountPaid - left.totalAmountPaid ||
      right.outstandingAmount - left.outstandingAmount
    )
  })

  const monthlyTrendData = monthlySummary.monthlyRevenue.map((item) => ({
    label: item.month.slice(0, 3).toUpperCase(),
    value: item.revenue,
  }))

  const strongestMonth = monthlySummary.monthlyRevenue.reduce(
    (top, month) => (month.revenue > top.revenue ? month : top),
    monthlySummary.monthlyRevenue[0] ?? { month: currentMonth.label, revenue: 0 },
  )

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Finance Dashboard"
        title="Operational finance overview"
        description="Track agencies, groups, collections, and outstanding balances from one compact dashboard using the existing live reporting APIs."
        action={
          <div className="flex justify-start lg:justify-end">
            <span className="inline-flex items-center rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100">
              Live Data
            </span>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {summaryCards.map((card) => (
          <DashboardMetricCard
            key={card.title}
            title={card.title}
            value={card.value}
            detail={card.detail}
            icon={card.icon}
            accentClassName={card.accentClassName}
          />
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.1fr,0.9fr]">
        <Panel
          title="Monthly Business Summary"
          description={`Current month finance view for ${currentMonth.label}, using live reports and existing dashboard totals.`}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {monthlyBusinessSummary.map((item) => (
              <SnapshotMetricCard
                key={item.label}
                label={item.label}
                value={item.value}
                detail={item.detail}
              />
            ))}
          </div>
        </Panel>

        <Panel title="Quick Actions" description="Open the most common daily finance and operations tasks.">
          <div className="grid gap-3 sm:grid-cols-2">
            {quickActions.map((item) => (
              <Link
                key={item.title}
                className="flex items-center justify-between gap-3 rounded-[20px] border border-white/10 bg-white/[0.04] px-4 py-3 transition hover:bg-white/[0.08]"
                to={item.href}
              >
                <span className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-100">
                    <item.icon className="h-4 w-4" />
                  </span>
                  <span className="block text-sm font-semibold text-white">{item.title}</span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-slate-500" />
              </Link>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.82fr,1.18fr]">
        <Panel
          title="Monthly Collection Trend"
          description={`Small ${currentMonth.year} collection trend from the existing report summary.`}
        >
          <div className="space-y-4">
            <MiniTrendChart data={monthlyTrendData} />
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Best Month
                </p>
                <p className="mt-2 text-sm font-semibold text-white">{strongestMonth.month}</p>
              </div>
              <div className="rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Best Collection
                </p>
                <p className="mt-2 text-sm font-semibold text-white">
                  {formatCurrency(strongestMonth.revenue)}
                </p>
              </div>
              <div className="rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Today's Collections
                </p>
                <p className="mt-2 text-sm font-semibold text-white">
                  {formatCurrency(todaysCollection)}
                </p>
              </div>
            </div>
          </div>
        </Panel>

        <Panel
          title="Country-wise Business Summary"
          description="Country totals are aggregated from the existing outstanding balance report."
        >
          {countrySummary.length === 0 ? (
            <EmptyState
              icon={ShieldCheck}
              title="No country summary available"
              description="Country totals will appear here once agencies, groups, and payments are available."
              compact
            />
          ) : (
            <div className="space-y-3">
              <div className="hidden px-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 md:grid md:grid-cols-[1.2fr,0.7fr,0.7fr,0.9fr,0.9fr] md:gap-3">
                <span>Country</span>
                <span className="text-right">Groups</span>
                <span className="text-right">Pax</span>
                <span className="text-right">Received</span>
                <span className="text-right">Outstanding</span>
              </div>
              <div className="app-table-wrap hidden md:block">
                <div className="space-y-2 p-2">
                  {countrySummary.slice(0, 8).map((country) => (
                    <div
                      key={country.country}
                      className="grid grid-cols-[1.2fr,0.7fr,0.7fr,0.9fr,0.9fr] gap-3 rounded-[18px] bg-white/[0.04] px-4 py-3 text-sm"
                    >
                      <span className="truncate font-semibold text-white">{country.country}</span>
                      <span className="text-right text-slate-200">{formatNumber(country.totalGroups)}</span>
                      <span className="text-right text-slate-200">{formatNumber(country.totalPax)}</span>
                      <span className="text-right text-slate-200">{formatCurrency(country.totalAmountPaid)}</span>
                      <span className="text-right text-rose-100">{formatCurrency(country.outstandingAmount)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid gap-3 md:hidden">
                {countrySummary.slice(0, 8).map((country) => (
                  <div key={country.country} className="rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm">
                    <p className="font-semibold text-white">{country.country}</p>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-slate-200">
                      <span>Groups: {formatNumber(country.totalGroups)}</span>
                      <span>Pax: {formatNumber(country.totalPax)}</span>
                      <span>Received: {formatCurrency(country.totalAmountPaid)}</span>
                      <span className="text-rose-100">Outstanding: {formatCurrency(country.outstandingAmount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Panel>
      </div>
    </div>
  )
}
