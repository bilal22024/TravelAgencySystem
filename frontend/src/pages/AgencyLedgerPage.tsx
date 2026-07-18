import { useEffect, useMemo, useState } from 'react'
import { Download, Printer, ShieldAlert } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingBlock } from '@/components/ui/LoadingBlock'
import { Panel } from '@/components/ui/Panel'
import { useAgenciesQuery } from '@/features/agencies/api'
import { useAuthStore } from '@/features/auth/store/useAuthStore'
import {
  downloadAgencyLedgerPdf,
  useAgencyLedgerQuery,
} from '@/features/reports/api'
import { formatCurrency, formatDate } from '@/lib/format'

function formatLedgerDate(value: string | null) {
  return value ? formatDate(value) : '-'
}

export function AgencyLedgerPage() {
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
  const [isExportingPdf, setIsExportingPdf] = useState(false)

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

  const selectedAgency = agencies.find((agency) => agency.id === selectedAgencyId) ?? null
  const canConsolidate = selectedAgency?.agencyType === 'PARENT'

  useEffect(() => {
    if (!canConsolidate && includeBranches) {
      setIncludeBranches(false)
    }
  }, [canConsolidate, includeBranches])

  const ledgerQueryParams = useMemo(
    () => ({
      agencyId: selectedAgencyId || undefined,
      includeBranches: includeBranches && canConsolidate,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    }),
    [canConsolidate, dateFrom, dateTo, includeBranches, selectedAgencyId],
  )

  const agencyLedgerQuery = useAgencyLedgerQuery(ledgerQueryParams, Boolean(selectedAgencyId))
  const ledger = agencyLedgerQuery.data

  if (agenciesQuery.isPending && !agenciesQuery.data) {
    return <LoadingBlock label="Loading agencies for the agency ledger..." />
  }

  if (agenciesQuery.isError) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Agency ledger setup failed"
        description="The agency list could not be loaded, so the dedicated ledger view cannot be prepared yet."
      />
    )
  }

  if (!selectedAgencyId) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Select an agency"
        description="Choose an agency first to open its complete financial ledger."
      />
    )
  }

  if (agencyLedgerQuery.isPending && !agencyLedgerQuery.data) {
    return <LoadingBlock label="Building the agency ledger..." />
  }

  if (agencyLedgerQuery.isError || !ledger) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Agency ledger could not be loaded"
        description="The ledger API did not return a valid response for the selected agency and date range."
      />
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          ledger.agency.reportScope === 'CONSOLIDATED'
            ? 'Consolidated parent ledger'
            : 'Agency ledger'
        }
        title={
          ledger.agency.reportScope === 'CONSOLIDATED'
            ? 'Track parent and branch balances in one combined ledger'
            : 'Track every agency transaction in chronological order'
        }
        description={
          ledger.agency.reportScope === 'CONSOLIDATED'
            ? 'This consolidated ledger combines parent and branch group charges, payments, and net external allocations while excluding internal transfers inside the same parent scope.'
            : 'This ledger now combines opening balance, group charges, direct payments, incoming allocations, and advance-balance usage into one finance-friendly running balance.'
        }
        action={
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
              type="button"
              onClick={() => window.print()}
            >
              <Printer className="h-4 w-4" />
              Print ledger
            </button>
            <button
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
              type="button"
              disabled={isExportingPdf}
              onClick={async () => {
                setIsExportingPdf(true)
                try {
                  await downloadAgencyLedgerPdf({
                    ...ledgerQueryParams,
                    agencyCode: ledger.agency.agentNumber,
                  })
                } finally {
                  setIsExportingPdf(false)
                }
              }}
            >
              <Download className="h-4 w-4" />
              {isExportingPdf ? 'Preparing...' : 'Export PDF'}
            </button>
          </div>
        }
      />

      <Panel
        title="Filters"
        description="Filter the ledger by agency and date range while keeping the opening balance aligned with transactions before the selected period."
      >
        <div className="grid gap-4 md:grid-cols-5">
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
                {selectedAgency?.name ?? ledger.agency.agencyName}
              </p>
            </div>
          )}

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              Ledger scope
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
        </div>
      </Panel>

      {ledger.agency.reportScope === 'CONSOLIDATED' ? (
        <Panel
          title="Scope Coverage"
          description="The consolidated ledger includes the parent agency and these connected branches."
        >
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[22px] border border-cyan-300/20 bg-cyan-400/10 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100">
                Parent agency
              </p>
              <p className="mt-3 text-sm font-semibold text-white">{ledger.agency.agencyName}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.18em] text-cyan-100/80">
                {ledger.agency.agentNumber}
              </p>
            </div>
            {ledger.agency.branches.map((branch) => (
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

      <div className="grid gap-4 xl:grid-cols-5">
        {[
          ['Agency', ledger.agency.agencyName, `${ledger.agency.country} • ${ledger.agency.city}`],
          ['Opening Balance', formatCurrency(ledger.summary.openingBalance), 'Carried forward from transactions before the selected date range.'],
          ['Total Credits', formatCurrency(ledger.summary.totalCredits), 'Payments and allocation credits inside the visible ledger period.'],
          ['Outstanding Balance', formatCurrency(ledger.summary.outstandingBalance), 'Current unpaid balance after visible transactions.'],
          ['Advance Balance', formatCurrency(ledger.summary.advanceBalance), 'Available credit balance after visible transactions.'],
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
        title="Ledger Summary"
        description="A compact view of the carried-forward balance, visible debits, credits, outstanding amount, and remaining advance."
      >
        <div className="grid gap-4 md:grid-cols-5">
          {[
            ['Opening Balance', ledger.summary.openingBalance],
            ['Total Debits', ledger.summary.totalDebits],
            ['Total Credits', ledger.summary.totalCredits],
            ['Outstanding Balance', ledger.summary.outstandingBalance],
            ['Net Balance', ledger.summary.netBalance],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-[22px] border border-white/10 bg-[rgba(7,15,27,0.45)] px-4 py-4"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                {label}
              </p>
              <p className="mt-3 text-lg font-semibold text-white">
                {formatCurrency(Number(value))}
              </p>
            </div>
          ))}
        </div>
      </Panel>

      <Panel
        title="Transactions"
        description="Every opening balance, group charge, payment, allocation, advance use, and closing balance row in chronological order."
        action={
          agencyLedgerQuery.isFetching ? (
            <span className="text-xs uppercase tracking-[0.18em] text-slate-400">Refreshing...</span>
          ) : null
        }
      >
        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-y-3">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Description</th>
                <th className="px-4 py-2">Reference Number</th>
                <th className="px-4 py-2 text-right">Debit</th>
                <th className="px-4 py-2 text-right">Credit</th>
                <th className="px-4 py-2 text-right">Balance</th>
                <th className="px-4 py-2 text-right">Running Balance</th>
              </tr>
            </thead>
            <tbody>
              {ledger.entries.map((entry) => (
                <tr key={entry.id} className="rounded-[20px] bg-white/[0.04] text-sm text-slate-100">
                  <td className="rounded-l-[20px] border-y border-l border-white/10 px-4 py-4">
                    {formatLedgerDate(entry.date)}
                  </td>
                  <td className="border-y border-white/10 px-4 py-4">{entry.description}</td>
                  <td className="border-y border-white/10 px-4 py-4">{entry.referenceNumber}</td>
                  <td className="border-y border-white/10 px-4 py-4 text-right">
                    {formatCurrency(entry.debit)}
                  </td>
                  <td className="border-y border-white/10 px-4 py-4 text-right">
                    {formatCurrency(entry.credit)}
                  </td>
                  <td className="border-y border-white/10 px-4 py-4 text-right">
                    {formatCurrency(entry.balance)}
                  </td>
                  <td className="rounded-r-[20px] border-y border-r border-white/10 px-4 py-4 text-right font-semibold text-white">
                    {formatCurrency(entry.runningBalance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  )
}
