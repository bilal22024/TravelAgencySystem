import { useMemo, useState } from 'react'
import { Download, FileSpreadsheet, FileText, ShieldAlert } from 'lucide-react'
import { BarChartCard } from '@/components/charts/BarChartCard'
import { LineChartCard } from '@/components/charts/LineChartCard'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingBlock } from '@/components/ui/LoadingBlock'
import { Panel } from '@/components/ui/Panel'
import { SearchInput } from '@/components/ui/SearchInput'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { downloadReportExport, useReportSummaryQuery } from '@/features/reports/api'
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch'
import { formatCurrency, formatDate, formatNumber } from '@/lib/format'

export function ReportsPage() {
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)
  const [month, setMonth] = useState<number | ''>('')
  const { searchText, debouncedSearchText, updateSearchText } = useDebouncedSearch()
  const reportQueryParams = useMemo(
    () => ({
      year,
      month: month || undefined,
      search: debouncedSearchText || undefined,
    }),
    [debouncedSearchText, month, year],
  )
  const reportQuery = useReportSummaryQuery(reportQueryParams)
  const [isDownloading, setIsDownloading] = useState<'' | 'csv' | 'excel' | 'pdf'>('')

  const report = reportQuery.data

  const agencyChartData = useMemo(() => {
    return (report?.agencyRevenue ?? []).slice(0, 6).map((agency) => ({
      label: agency.agencyCode,
      value: agency.revenue,
      secondaryValue: agency.outstandingBalance,
    }))
  }, [report])

  const countryChartData = useMemo(() => {
    return (report?.countryRevenue ?? []).slice(0, 6).map((country) => ({
      label: country.country,
      value: country.revenue,
      secondaryValue: country.outstandingBalance,
    }))
  }, [report])

  if (reportQuery.isPending && !reportQuery.data) {
    return <LoadingBlock label="Building report summaries..." />
  }

  if (reportQuery.isError || !report) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Reports are not ready yet"
        description="The reporting API did not return a valid summary for the current filters."
      />
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Reports and exports"
        title="Review consolidated finance summaries with export-ready reporting"
        description="Phase 3 extends reporting so parent agencies can review consolidated revenue, outstanding balances, advance balances, and net exposure from the same backend aggregation used by exports."
        action={
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { format: 'csv' as const, label: 'CSV Export', icon: Download },
              { format: 'excel' as const, label: 'Excel Export', icon: FileSpreadsheet },
              { format: 'pdf' as const, label: 'PDF Export', icon: FileText },
            ].map((item) => (
              <button
                key={item.format}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                type="button"
                disabled={isDownloading !== ''}
                onClick={async () => {
                  setIsDownloading(item.format)
                  try {
                    await downloadReportExport(item.format, {
                      year,
                      month: month || undefined,
                      search: debouncedSearchText || undefined,
                    })
                  } finally {
                    setIsDownloading('')
                  }
                }}
              >
                <item.icon className="h-4 w-4" />
                {isDownloading === item.format ? 'Preparing...' : item.label}
              </button>
            ))}
          </div>
        }
      />

      <Panel title="Filters" description="Adjust the report period before exporting or reading the charts.">
        <div className="grid gap-4 md:grid-cols-4">
          <label className="block md:col-span-2">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              Search report data
            </span>
            <SearchInput
              placeholder="Search by agency, country, city, or group number"
              value={searchText}
              onChange={updateSearchText}
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              Report year
            </span>
            <input
              className="w-full rounded-2xl border border-white/10 bg-[rgba(7,15,27,0.55)] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/50"
              min={2000}
              max={2100}
              type="number"
              value={year}
              onChange={(event) => setYear(Number(event.target.value))}
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              Report month
            </span>
            <select
              className="w-full rounded-2xl border border-white/10 bg-[rgba(7,15,27,0.55)] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/50"
              value={month}
              onChange={(event) =>
                setMonth(event.target.value ? Number(event.target.value) : '')
              }
            >
              <option value="">All months</option>
              {Array.from({ length: 12 }, (_, index) => (
                <option key={index + 1} value={index + 1}>
                  {new Intl.DateTimeFormat('en-US', { month: 'long' }).format(
                    new Date(year, index, 1),
                  )}
                </option>
              ))}
            </select>
          </label>

          <div className="rounded-[24px] border border-cyan-300/20 bg-cyan-400/10 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-100">
              Filter summary
            </p>
            <p className="mt-3 text-sm text-slate-100">
              Year {report.filters.year}
              {report.filters.month ? ` • Month ${report.filters.month}` : ' • All months'}
              {debouncedSearchText ? ` • Search "${debouncedSearchText}"` : ''}
            </p>
          </div>
        </div>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-6">
        {[
          {
            label: 'Payments received',
            value: formatCurrency(report.totals.totalRevenue),
            detail: `${formatNumber(report.totals.paymentCount)} payments captured in the selected period.`,
          },
          {
            label: 'Outstanding balances',
            value: formatCurrency(report.totals.outstandingBalance),
            detail: 'Remaining unpaid balances after live allocation calculations.',
          },
          {
            label: 'Agency-owned advances',
            value: formatCurrency(report.totals.advanceBalance),
            detail: 'Unallocated balances that remain owned by their original payment agencies.',
          },
          {
            label: 'Net balance',
            value: formatCurrency(report.totals.netBalance),
            detail: 'Outstanding balance after deducting visible advance balances.',
          },
          {
            label: 'Allocated revenue',
            value: formatCurrency(report.totals.allocatedRevenue),
            detail: `${Math.round(report.totals.allocationCoverageRate * 100)}% of visible payments are allocated to groups.`,
          },
          {
            label: 'Active agencies',
            value: formatNumber(report.totals.activeAgencyCount),
            detail: 'Agencies currently visible inside the authenticated reporting scope.',
          },
        ].map((metric) => (
          <div
            key={metric.label}
            className="rounded-[28px] border border-white/10 bg-white/[0.05] p-5 shadow-panel backdrop-blur"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
              {metric.label}
            </p>
            <p className="mt-4 font-display text-3xl text-white">{metric.value}</p>
            <p className="mt-3 text-sm text-slate-300">{metric.detail}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <LineChartCard
          title="Monthly revenue"
          description="Revenue trend across the selected year, using the backend report summary as the single source of truth."
          data={report.monthlyRevenue.map((item) => ({
            label: item.month,
            value: item.revenue,
          }))}
        />
        <BarChartCard
          title="Agency-wise revenue"
          description="Top revenue-generating agencies with their outstanding balances carried as the secondary value."
          data={agencyChartData}
          valuePrefix="$"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <BarChartCard
          title="Country-wise revenue"
          description="Revenue totals by country, including outstanding balance as a secondary reference."
          data={countryChartData}
          valuePrefix="$"
        />

        <Panel
          title="Outstanding balances"
          description="The highest remaining balances from the selected period, ready for finance follow-up or export."
        >
          <div className="space-y-3">
            {report.outstandingBalances.length === 0 ? (
              <EmptyState
                icon={ShieldAlert}
                title="No outstanding balances"
                description="All filtered payments are fully allocated or there are no payments in the current period."
              />
            ) : (
              report.outstandingBalances.slice(0, 8).map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-3 rounded-[22px] border border-white/10 bg-white/[0.04] px-4 py-4 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold text-white">{item.reference}</p>
                    <p className="mt-1 text-sm text-slate-300">
                      {item.agencyName} • {item.country} • Paid {formatDate(item.paidAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-semibold text-white">
                        {formatCurrency(item.remainingBalance, item.currency)}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">
                        Total {formatCurrency(item.amount, item.currency)}
                      </p>
                    </div>
                    <StatusBadge label={item.status.replace(/_/g, ' ')} tone="warning" />
                  </div>
                </div>
              ))
            )}
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel
          title="Agency revenue table"
          description="Agency-level totals for direct payments, outstanding balances, agency-owned advances, and net position from the live report snapshot."
        >
          <div className="space-y-3">
            {report.agencyRevenue.slice(0, 8).map((agency) => (
              <div
                key={agency.agencyId}
                className="flex items-center justify-between rounded-[22px] border border-white/10 bg-white/[0.04] px-4 py-4"
              >
                <div>
                  <p className="text-sm font-semibold text-white">{agency.agencyName}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">
                    {agency.agencyCode} • {agency.country}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-white">
                    {formatCurrency(agency.revenue)}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">
                    Outstanding {formatCurrency(agency.outstandingBalance)} • Agency-Owned Advance{' '}
                    {formatCurrency(agency.advanceBalance)} • Net {formatCurrency(agency.netBalance)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel
          title="Export readiness"
          description="Deployment-facing notes for how these exports behave in production."
        >
          <div className="space-y-4 text-sm text-slate-300">
            <p>
              PDF, Excel, and CSV files are generated by the backend report module, so frontend and
              backend downloads stay aligned in development and production.
            </p>
            <p>
              Export endpoints respect the authenticated agency scope, which means parent agencies
              receive their consolidated parent-and-branch scope while branch users remain limited
              to their own data.
            </p>
            <p>
              The same filtered report summary powers the charts, the on-screen tables, and the
              exported files, keeping the reporting surface consistent for deployment.
            </p>
          </div>
        </Panel>
      </div>
    </div>
  )
}
