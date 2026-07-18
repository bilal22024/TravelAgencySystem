import { useEffect, useMemo, useState } from 'react'
import { Download, FileSpreadsheet, Printer, ShieldAlert } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingBlock } from '@/components/ui/LoadingBlock'
import { Panel } from '@/components/ui/Panel'
import { SearchInput } from '@/components/ui/SearchInput'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useAgenciesQuery } from '@/features/agencies/api'
import { useAuthStore } from '@/features/auth/store/useAuthStore'
import {
  downloadAgencyReportExport,
  useAgencyReportQuery,
} from '@/features/reports/api'
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch'
import { formatCurrency, formatDate, formatNumber } from '@/lib/format'

const paymentStatusOptions = [
  { value: '', label: 'All payment statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'PARTIALLY_ALLOCATED', label: 'Partially allocated' },
  { value: 'ALLOCATED', label: 'Allocated' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'REFUNDED', label: 'Refunded' },
] as const

export function AgencyReportPage() {
  const user = useAuthStore((state) => state.user)
  const isSuperAdmin = user?.role === 'SUPER_ADMIN'
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedAgencyId, setSelectedAgencyId] = useState(
    searchParams.get('agencyId') ?? user?.agencyId ?? '',
  )
  const [includeBranches, setIncludeBranches] = useState(
    searchParams.get('includeBranches') === 'true',
  )
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [paymentStatus, setPaymentStatus] = useState<
    '' | 'PENDING' | 'PARTIALLY_ALLOCATED' | 'ALLOCATED' | 'FAILED' | 'REFUNDED'
  >('')
  const [isDownloading, setIsDownloading] = useState<'' | 'excel' | 'pdf'>('')
  const { searchText, debouncedSearchText, updateSearchText } = useDebouncedSearch()

  const agenciesQuery = useAgenciesQuery({
    page: 1,
    pageSize: 250,
    sortBy: 'name',
    sortOrder: 'asc',
  })
  const agencies = agenciesQuery.data?.data ?? []

  useEffect(() => {
    if (!isSuperAdmin && user?.agencyId) {
      setSelectedAgencyId(user.agencyId)
      return
    }

    if (isSuperAdmin && !selectedAgencyId && agencies.length > 0) {
      const nextAgencyId = searchParams.get('agencyId') ?? agencies[0]?.id ?? ''
      setSelectedAgencyId(nextAgencyId)
    }
  }, [agencies, isSuperAdmin, searchParams, selectedAgencyId, user?.agencyId])

  useEffect(() => {
    if (!selectedAgencyId) {
      return
    }

    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      next.set('agencyId', selectedAgencyId)
      if (includeBranches) {
        next.set('includeBranches', 'true')
      } else {
        next.delete('includeBranches')
      }
      return next
    })
  }, [includeBranches, selectedAgencyId, setSearchParams])

  const selectedAgency =
    agencies.find((agency) => agency.id === selectedAgencyId) ?? null
  const canConsolidate = selectedAgency?.agencyType === 'PARENT'

  useEffect(() => {
    if (!canConsolidate && includeBranches) {
      setIncludeBranches(false)
    }
  }, [canConsolidate, includeBranches])

  const reportQueryParams = useMemo(
    () => ({
      agencyId: selectedAgencyId || undefined,
      includeBranches: includeBranches && canConsolidate,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      groupNumber: debouncedSearchText || undefined,
      paymentStatus: paymentStatus || undefined,
    }),
    [canConsolidate, dateFrom, dateTo, debouncedSearchText, includeBranches, paymentStatus, selectedAgencyId],
  )

  const agencyReportQuery = useAgencyReportQuery(reportQueryParams, Boolean(selectedAgencyId))
  const report = agencyReportQuery.data

  if (agenciesQuery.isPending && !agenciesQuery.data) {
    return <LoadingBlock label="Loading agencies for agency reporting..." />
  }

  if (agenciesQuery.isError) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Agency report setup failed"
        description="The agency list could not be loaded, so the dedicated agency report page cannot be prepared yet."
      />
    )
  }

  if (!selectedAgencyId) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Select an agency"
        description="Choose an agency first to open its dedicated report."
      />
    )
  }

  if (agencyReportQuery.isPending && !agencyReportQuery.data) {
    return <LoadingBlock label="Building the dedicated agency report..." />
  }

  if (agencyReportQuery.isError || !report) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Agency report could not be loaded"
        description="The report API did not return a valid response for the selected agency and filters."
      />
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          report.agency.reportScope === 'CONSOLIDATED'
            ? 'Consolidated parent reporting'
            : 'Dedicated agency reporting'
        }
        title={
          report.agency.reportScope === 'CONSOLIDATED'
            ? 'Review a parent agency with all connected branch activity'
            : 'Review one agency across groups, allocations, and payment history'
        }
        description={
          report.agency.reportScope === 'CONSOLIDATED'
            ? 'This consolidated report combines parent and branch groups, payments, allocations, and balances into one finance-ready view while preserving the underlying agency ledgers.'
            : 'This report reuses the existing agency, group, payment, and allocation data so finance and operations can inspect one travel agency in detail without changing the underlying business rules.'
        }
        action={
          <div className="grid gap-3 sm:grid-cols-3">
            <button
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
              type="button"
              onClick={() => window.print()}
            >
              <Printer className="h-4 w-4" />
              Print report
            </button>
            <button
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
              type="button"
              disabled={isDownloading !== ''}
              onClick={async () => {
                setIsDownloading('pdf')
                try {
                  await downloadAgencyReportExport('pdf', {
                    ...reportQueryParams,
                    agencyCode: report.agency.agentNumber,
                  })
                } finally {
                  setIsDownloading('')
                }
              }}
            >
              <Download className="h-4 w-4" />
              {isDownloading === 'pdf' ? 'Preparing...' : 'Export PDF'}
            </button>
            <button
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
              type="button"
              disabled={isDownloading !== ''}
              onClick={async () => {
                setIsDownloading('excel')
                try {
                  await downloadAgencyReportExport('excel', {
                    ...reportQueryParams,
                    agencyCode: report.agency.agentNumber,
                  })
                } finally {
                  setIsDownloading('')
                }
              }}
            >
              <FileSpreadsheet className="h-4 w-4" />
              {isDownloading === 'excel' ? 'Preparing...' : 'Export Excel'}
            </button>
          </div>
        }
      />

      <Panel
        title="Filters"
        description="Use the same scoped filters for the agency summary, group details, payment history, and export actions."
      >
        <div className="grid gap-4 md:grid-cols-6">
          {isSuperAdmin ? (
            <label className="block md:col-span-2">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                Travel agency
              </span>
              <select
                className="w-full rounded-2xl border border-white/10 bg-[rgba(7,15,27,0.55)] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/50"
                value={selectedAgencyId}
                onChange={(event) => setSelectedAgencyId(event.target.value)}
              >
                {agencies.map((agency) => (
                  <option key={agency.id} value={agency.id}>
                    {agency.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <div className="rounded-[24px] border border-cyan-300/20 bg-cyan-400/10 p-4 md:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-100">
                Agency scope
              </p>
              <p className="mt-3 text-sm text-slate-100">
                {selectedAgency?.name ?? report.agency.agencyName}
              </p>
            </div>
          )}

          <label className="block md:col-span-3">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              Group number
            </span>
            <SearchInput
              placeholder="Filter by group number"
              value={searchText}
              onChange={updateSearchText}
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              Report scope
            </span>
            <select
              className="w-full rounded-2xl border border-white/10 bg-[rgba(7,15,27,0.55)] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/50"
              value={includeBranches && canConsolidate ? 'consolidated' : 'single'}
              onChange={(event) => setIncludeBranches(event.target.value === 'consolidated')}
              disabled={!canConsolidate}
            >
              <option value="single">Selected agency only</option>
              <option value="consolidated" disabled={!canConsolidate}>
                Parent + branches
              </option>
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              Date from
            </span>
            <input
              className="w-full rounded-2xl border border-white/10 bg-[rgba(7,15,27,0.55)] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/50"
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
              className="w-full rounded-2xl border border-white/10 bg-[rgba(7,15,27,0.55)] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/50"
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              Payment status
            </span>
            <select
              className="w-full rounded-2xl border border-white/10 bg-[rgba(7,15,27,0.55)] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/50"
              value={paymentStatus}
              onChange={(event) =>
                setPaymentStatus(
                  event.target.value as
                    | ''
                    | 'PENDING'
                    | 'PARTIALLY_ALLOCATED'
                    | 'ALLOCATED'
                    | 'FAILED'
                    | 'REFUNDED',
                )
              }
            >
              {paymentStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
              Filter summary
            </p>
            <p className="mt-3 text-sm text-slate-100">
              {report.agency.agencyName}
              {report.filters.includeBranches ? ' • Consolidated' : ' • Single agency'}
              {report.filters.groupNumber ? ` • ${report.filters.groupNumber}` : ' • All groups'}
              {report.filters.paymentStatus
                ? ` • ${report.filters.paymentStatus.replace(/_/g, ' ')}`
                : ' • All payment statuses'}
            </p>
          </div>
        </div>
      </Panel>

      {report.agency.reportScope === 'CONSOLIDATED' ? (
        <Panel
          title="Scope Coverage"
          description="The consolidated parent report includes the following connected agencies."
        >
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[22px] border border-cyan-300/20 bg-cyan-400/10 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100">
                Parent agency
              </p>
              <p className="mt-3 text-sm font-semibold text-white">{report.agency.agencyName}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.18em] text-cyan-100/80">
                {report.agency.agentNumber}
              </p>
            </div>
            {report.agency.branches.map((branch) => (
              <div
                key={branch.id}
                className="rounded-[22px] border border-white/10 bg-[rgba(7,15,27,0.45)] px-4 py-4"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Branch
                </p>
                <p className="mt-3 text-sm font-semibold text-white">{branch.agencyName}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">
                  {branch.agentNumber} • {branch.country}
                </p>
              </div>
            ))}
          </div>
        </Panel>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-4">
        {[
          {
            label: 'Agency name',
            value: report.agency.agencyName,
            detail: `${report.agency.country} • ${report.agency.city}`,
          },
          {
            label: 'Agent number',
            value: report.agency.agentNumber,
            detail: `${formatNumber(report.businessSummary.totalGroups)} groups in the visible report scope.`,
          },
          {
            label: 'Total amount paid',
            value: formatCurrency(report.businessSummary.totalAmountPaid),
            detail: 'Total payment value captured by the filtered payment history.',
          },
          {
            label: 'Net balance',
            value: formatCurrency(report.businessSummary.netBalance),
            detail: 'Outstanding amount after available advance balance is deducted.',
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

      <Panel
        title="Business Summary"
        description="Agency-level totals derived from the current group and payment filters."
      >
        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-8">
          {[
            ['Total Groups', formatNumber(report.businessSummary.totalGroups)],
            ['Total Passengers', formatNumber(report.businessSummary.totalPassengers)],
            ['Price Per Pax', formatCurrency(report.businessSummary.pricePerPax)],
            ['Total Amount', formatCurrency(report.businessSummary.totalAmount)],
            ['Total Amount Paid', formatCurrency(report.businessSummary.totalAmountPaid)],
            ['Remaining Balance', formatCurrency(report.businessSummary.remainingBalance)],
            ['Advance Balance', formatCurrency(report.businessSummary.advanceBalance)],
            ['Net Balance', formatCurrency(report.businessSummary.netBalance)],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-[22px] border border-white/10 bg-[rgba(7,15,27,0.45)] px-4 py-4"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                {label}
              </p>
              <p className="mt-3 text-lg font-semibold text-white">{value}</p>
            </div>
          ))}
        </div>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
        <Panel
          title="Group Details"
          description="Each group shows passenger volume, allocated amount, price per pax, and derived payment status."
        >
          <div className="space-y-3">
            {report.groupDetails.length === 0 ? (
              <EmptyState
                icon={ShieldAlert}
                title="No groups match these filters"
                description="Adjust the group number, date range, or payment status to bring groups back into the report."
              />
            ) : (
              report.groupDetails.map((group) => (
                <div
                  key={group.groupId}
                  className="flex flex-col gap-4 rounded-[22px] border border-white/10 bg-white/[0.04] px-4 py-4 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold text-white">{group.groupNumber}</p>
                    <p className="mt-1 text-sm text-slate-300">
                      {report.agency.reportScope === 'CONSOLIDATED'
                        ? `${group.agencyCode} • `
                        : ''}
                      {formatNumber(group.numberOfPax)} pax • {formatCurrency(group.pricePerPax)} per
                      pax
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-semibold text-white">
                        {formatCurrency(group.groupAmount)}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">
                        Group amount
                      </p>
                    </div>
                    <StatusBadge
                      label={group.paymentStatus.replace(/_/g, ' ')}
                      tone={
                        group.paymentStatus === 'ALLOCATED'
                          ? 'success'
                          : group.paymentStatus === 'PENDING'
                            ? 'warning'
                            : 'neutral'
                      }
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </Panel>

        <Panel
          title="Calculations"
          description="Finance-facing totals from the same filtered report snapshot."
        >
          <div className="space-y-4">
            {[
              ['Total Revenue', report.calculations.totalRevenue],
              ['Total Paid', report.calculations.totalPaid],
              ['Outstanding Balance', report.calculations.outstandingBalance],
              ['Advance Balance', report.businessSummary.advanceBalance],
              ['Net Balance', report.businessSummary.netBalance],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-[22px] border border-white/10 bg-[rgba(7,15,27,0.45)] px-4 py-4"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  {label}
                </p>
                <p className="mt-3 font-display text-3xl text-white">
                  {formatCurrency(Number(value))}
                </p>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel
        title="Payment History"
        description="The filtered payment ledger for this agency, including city, receiver, method, remarks, and live status."
        action={
          agencyReportQuery.isFetching ? (
            <span className="text-xs uppercase tracking-[0.18em] text-slate-400">Refreshing...</span>
          ) : null
        }
      >
        <div className="space-y-3">
          {report.paymentHistory.length === 0 ? (
            <EmptyState
              icon={ShieldAlert}
              title="No payments match these filters"
              description="Try broadening the date range or clearing the payment status filter."
            />
          ) : (
            report.paymentHistory.map((payment) => (
              <div
                key={payment.id}
                className="rounded-[22px] border border-white/10 bg-white/[0.04] px-4 py-4"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {formatDate(payment.paymentDate)} • {formatCurrency(payment.amountPaid)}
                    </p>
                    <p className="mt-1 text-sm text-slate-300">
                      {payment.paymentCity} • {payment.receivedBy} •{' '}
                      {payment.paymentMethod.replace(/_/g, ' ')}
                    </p>
                    <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-400">
                      {payment.reference} • Paid by {payment.paidByAgencyCode} •{' '}
                      {payment.paymentGroups.length > 0
                        ? payment.paymentGroups
                            .map((group) =>
                              report.agency.reportScope === 'CONSOLIDATED'
                                ? `${group.agencyCode}/${group.groupNumber}`
                                : group.groupNumber,
                            )
                            .join(', ')
                        : 'No allocations'}
                      {' • '}
                      {payment.remarks}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-semibold text-white">
                        {formatCurrency(payment.advanceBalance)}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">
                        Advance balance
                      </p>
                    </div>
                    <StatusBadge
                      label={payment.paymentStatus.replace(/_/g, ' ')}
                      tone={
                        payment.paymentStatus === 'ALLOCATED'
                          ? 'success'
                          : payment.paymentStatus === 'PENDING'
                            ? 'warning'
                            : 'neutral'
                      }
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Panel>
    </div>
  )
}
