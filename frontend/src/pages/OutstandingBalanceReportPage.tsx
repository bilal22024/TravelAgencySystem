import { useMemo, useState } from 'react'
import {
  Download,
  FileSpreadsheet,
  FileText,
  Printer,
  Receipt,
  ShieldAlert,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingBlock } from '@/components/ui/LoadingBlock'
import { Panel } from '@/components/ui/Panel'
import { SearchInput } from '@/components/ui/SearchInput'
import { StatusBadge } from '@/components/ui/StatusBadge'
import {
  downloadOutstandingBalanceReportExport,
  useOutstandingBalanceReportQuery,
} from '@/features/reports/api'
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch'
import { formatCurrency, formatDate, formatNumber } from '@/lib/format'
import type { OutstandingBalancePaymentStatus } from '@/types/api'

const paymentStatusOptions: Array<{
  value: '' | OutstandingBalancePaymentStatus
  label: string
}> = [
  { value: '', label: 'All payment statuses' },
  { value: 'FULLY_PAID', label: 'Fully Paid' },
  { value: 'PARTIALLY_PAID', label: 'Partially Paid' },
  { value: 'UNPAID', label: 'Unpaid' },
]

function getStatusTone(status: OutstandingBalancePaymentStatus) {
  switch (status) {
    case 'FULLY_PAID':
      return 'success' as const
    case 'PARTIALLY_PAID':
      return 'warning' as const
    case 'UNPAID':
      return 'neutral' as const
  }
}

export function OutstandingBalanceReportPage() {
  const [paymentStatus, setPaymentStatus] = useState<'' | OutstandingBalancePaymentStatus>('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sortBy, setSortBy] = useState<'outstandingBalance' | 'agencyName' | 'lastPaymentDate'>(
    'outstandingBalance',
  )
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [isDownloading, setIsDownloading] = useState<'' | 'csv' | 'excel' | 'pdf'>('')
  const { searchText, debouncedSearchText, updateSearchText } = useDebouncedSearch()

  const reportQueryParams = useMemo(
    () => ({
      search: debouncedSearchText || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      paymentStatus: paymentStatus || undefined,
      sortBy,
      sortOrder,
    }),
    [dateFrom, dateTo, debouncedSearchText, paymentStatus, sortBy, sortOrder],
  )

  const reportQuery = useOutstandingBalanceReportQuery(reportQueryParams)
  const report = reportQuery.data

  if (reportQuery.isPending && !reportQuery.data) {
    return <LoadingBlock label="Building the outstanding balance report..." />
  }

  if (reportQuery.isError || !report) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Outstanding balance report could not be loaded"
        description="The report API did not return a valid response for the current search, filters, or sorting."
      />
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Outstanding balance report"
        title="Outstanding Balances"
        description="Review unpaid and partially paid balances in one finance-friendly report with aligned search, filters, and exports."
        action={
          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <button
              className="app-button-secondary"
              type="button"
              onClick={() => window.print()}
            >
              <Printer className="h-4 w-4" />
              Print Report
            </button>
            {[
              { format: 'csv' as const, label: 'Export CSV', icon: Download },
              { format: 'excel' as const, label: 'Export Excel', icon: FileSpreadsheet },
              { format: 'pdf' as const, label: 'Export PDF', icon: FileText },
            ].map((item) => (
              <button
                key={item.format}
                className="app-button-secondary"
                type="button"
                disabled={isDownloading !== ''}
                onClick={async () => {
                  setIsDownloading(item.format)
                  try {
                    await downloadOutstandingBalanceReportExport(item.format, reportQueryParams)
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

      <Panel
        title="Filters"
        description="Search agencies, narrow by derived payment status, apply a date range, and sort the report without changing the underlying payment logic."
      >
        <div className="grid gap-4 md:grid-cols-6">
          <label className="block md:col-span-2">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              Search agencies
            </span>
            <SearchInput
              placeholder="Search by agency, agent number, country, or city"
              value={searchText}
              onChange={updateSearchText}
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              Payment status
            </span>
            <select
              className="app-field"
              value={paymentStatus}
              onChange={(event) =>
                setPaymentStatus(event.target.value as '' | OutstandingBalancePaymentStatus)
              }
            >
              {paymentStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              Date from
            </span>
            <input
              className="app-field"
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              Date to
            </span>
            <input
              className="app-field"
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              Sort by
            </span>
            <select
              className="app-field"
              value={sortBy}
              onChange={(event) =>
                setSortBy(
                  event.target.value as 'outstandingBalance' | 'agencyName' | 'lastPaymentDate',
                )
              }
            >
              <option value="outstandingBalance">Outstanding balance</option>
              <option value="agencyName">Agency name</option>
              <option value="lastPaymentDate">Last payment date</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              Sort order
            </span>
            <select
              className="app-field"
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value as 'asc' | 'desc')}
            >
              <option value="desc">Desc</option>
              <option value="asc">Asc</option>
            </select>
          </label>
        </div>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-4">
        {[
          [
            'Total Outstanding Amount',
            formatCurrency(report.summary.totalOutstandingAmount),
            'Visible agencies only, based on the current search and date filters.',
          ],
          [
            'Total Fully Paid Agencies',
            formatNumber(report.summary.totalFullyPaidAgencies),
            'Agencies whose filtered outstanding balance is zero.',
          ],
          [
            'Total Partially Paid Agencies',
            formatNumber(report.summary.totalPartiallyPaidAgencies),
            'Agencies with both visible paid/allocated activity and a remaining balance.',
          ],
          [
            'Total Unpaid Agencies',
            formatNumber(report.summary.totalUnpaidAgencies),
            'Agencies whose visible balance remains open with no allocated amount in scope.',
          ],
        ].map(([label, value, detail]) => (
          <div
            key={label}
            className="rounded-[28px] border border-white/10 bg-white/[0.05] p-5 shadow-panel backdrop-blur"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
              {label}
            </p>
            <p className="mt-4 font-display text-3xl text-white">{value}</p>
            <p className="mt-3 text-sm text-slate-300">{detail}</p>
          </div>
        ))}
      </div>

      <Panel
        title="Agencies"
        description="Every row combines agency details, balance metrics, derived payment status, and the next operational actions."
        action={
          reportQuery.isFetching ? (
            <span className="text-xs uppercase tracking-[0.18em] text-slate-400">Refreshing...</span>
          ) : null
        }
      >
        {report.rows.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No agencies match these filters"
            description="Try clearing the search, broadening the date range, or switching the payment status filter."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-3">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  <th className="px-4 py-2">Agency Name</th>
                  <th className="px-4 py-2">Country</th>
                  <th className="px-4 py-2">City</th>
                  <th className="px-4 py-2">Agent Number</th>
                  <th className="px-4 py-2 text-right">Total Groups</th>
                  <th className="px-4 py-2 text-right">Total Pax</th>
                  <th className="px-4 py-2 text-right">Total Amount</th>
                  <th className="px-4 py-2 text-right">Total Allocated To Groups</th>
                  <th className="px-4 py-2 text-right">Outstanding Balance</th>
                  <th className="px-4 py-2 text-right">Agency-Owned Advance Balance</th>
                  <th className="px-4 py-2 text-right">Net Balance</th>
                  <th className="px-4 py-2">Payment Status</th>
                  <th className="px-4 py-2">Last Payment Date</th>
                  <th className="px-4 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {report.rows.map((row) => (
                  <tr key={row.agencyId} className="align-top text-sm text-slate-100">
                    <td className="rounded-l-[20px] border-y border-l border-white/10 bg-white/[0.04] px-4 py-4 font-semibold text-white">
                      {row.agencyName}
                    </td>
                    <td className="border-y border-white/10 bg-white/[0.04] px-4 py-4">{row.country}</td>
                    <td className="border-y border-white/10 bg-white/[0.04] px-4 py-4">{row.city}</td>
                    <td className="border-y border-white/10 bg-white/[0.04] px-4 py-4">
                      {row.agentNumber}
                    </td>
                    <td className="border-y border-white/10 bg-white/[0.04] px-4 py-4 text-right">
                      {formatNumber(row.totalGroups)}
                    </td>
                    <td className="border-y border-white/10 bg-white/[0.04] px-4 py-4 text-right">
                      {formatNumber(row.totalPax)}
                    </td>
                    <td className="border-y border-white/10 bg-white/[0.04] px-4 py-4 text-right">
                      {formatCurrency(row.totalAmount)}
                    </td>
                    <td className="border-y border-white/10 bg-white/[0.04] px-4 py-4 text-right">
                      {formatCurrency(row.totalAmountPaid)}
                    </td>
                    <td className="border-y border-white/10 bg-white/[0.04] px-4 py-4 text-right font-semibold text-white">
                      {formatCurrency(row.outstandingBalance)}
                    </td>
                    <td className="border-y border-white/10 bg-white/[0.04] px-4 py-4 text-right">
                      {formatCurrency(row.advanceBalance)}
                    </td>
                    <td className="border-y border-white/10 bg-white/[0.04] px-4 py-4 text-right">
                      {formatCurrency(row.netBalance)}
                    </td>
                    <td className="border-y border-white/10 bg-white/[0.04] px-4 py-4">
                      <StatusBadge
                        label={row.paymentStatusLabel}
                        tone={getStatusTone(row.paymentStatus)}
                      />
                    </td>
                    <td className="border-y border-white/10 bg-white/[0.04] px-4 py-4">
                      {row.lastPaymentDate ? formatDate(row.lastPaymentDate) : 'No payments'}
                    </td>
                    <td className="rounded-r-[20px] border-y border-r border-white/10 bg-white/[0.04] px-4 py-4">
                      <div className="flex flex-col gap-2">
                        <Link
                          className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-center text-xs font-semibold uppercase tracking-[0.18em] text-slate-100 transition hover:bg-white/10"
                          to={`/reports/agency?agencyId=${row.agencyId}`}
                        >
                          View Agency Report
                        </Link>
                        <Link
                          className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-center text-xs font-semibold uppercase tracking-[0.18em] text-slate-100 transition hover:bg-white/10"
                          to={`/reports/agency-ledger?agencyId=${row.agencyId}`}
                        >
                          View Agency Ledger
                        </Link>
                        <Link
                          className="rounded-2xl border border-cyan-300/20 bg-cyan-400/10 px-3 py-2 text-center text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100 transition hover:bg-cyan-400/20"
                          to={`/payments?agencyId=${row.agencyId}&mode=new`}
                        >
                          Record New Payment
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  )
}
