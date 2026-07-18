import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Download, FileSpreadsheet, Printer, ShieldAlert } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
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
import type { AgencyListItem } from '@/types/api'

type AgencyReportData = NonNullable<ReturnType<typeof useAgencyReportQuery>['data']>

const paymentStatusOptions = [
  { value: '', label: 'All payment statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'PARTIALLY_ALLOCATED', label: 'Partially allocated' },
  { value: 'ALLOCATED', label: 'Allocated' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'REFUNDED', label: 'Refunded' },
] as const

function getAgencyHierarchyType(agency: AgencyListItem) {
  if (agency.parentAgency) {
    return 'BRANCH' as const
  }

  if (agency.branchCount > 0) {
    return 'PARENT' as const
  }

  return 'STANDALONE' as const
}

function buildAgencyOptionLabel(agency: AgencyListItem) {
  const hierarchyType = getAgencyHierarchyType(agency)

  if (hierarchyType === 'BRANCH') {
    return `${agency.name} (${agency.code}) - Branch of ${agency.parentAgency?.name ?? 'Unknown parent'}`
  }

  if (hierarchyType === 'PARENT') {
    return `${agency.name} (${agency.code}) - Parent`
  }

  return `${agency.name} (${agency.code}) - Standalone`
}

function buildAgencyBaseLabel(agency: AgencyListItem) {
  return `${agency.name} (${agency.code})`
}

function buildAgencySearchText(agency: AgencyListItem) {
  return [
    agency.name,
    agency.code,
    agency.parentAgency?.name,
    agency.parentAgency?.code,
    agency.city,
    agency.country,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function getClosedSelectorLabel(report: AgencyReportData) {
  const agencyLabel = `${report.agency.agencyName} (${report.agency.agentNumber})`

  if (report.agency.reportScope === 'CONSOLIDATED') {
    return `${agencyLabel} - Consolidated`
  }

  if (report.agency.hierarchyType === 'PARENT') {
    return `${agencyLabel} - Parent Only`
  }

  if (report.agency.hierarchyType === 'BRANCH' && report.agency.parentAgency) {
    return `${agencyLabel} - Branch of ${report.agency.parentAgency.agencyName}`
  }

  return `${agencyLabel} - Standalone`
}

function getScopePresentation(report: AgencyReportData) {
  const visibleHierarchyType =
    report.agency.visibleAgencyFilter?.hierarchyType ?? report.agency.hierarchyType
  const isConsolidatedAll =
    report.agency.reportScope === 'CONSOLIDATED' && report.agency.visibleAgencyFilter === null
  const isBranchVisible = visibleHierarchyType === 'BRANCH'
  const isParentVisible = visibleHierarchyType === 'PARENT'

  const directPaymentLabel = isConsolidatedAll
    ? 'Total Family Payments Received'
    : isBranchVisible
      ? 'Direct Payments by Branch'
      : isParentVisible
        ? 'Direct Payments by Parent'
        : 'Direct Payments by Agency'

  const directPaymentDetail = isConsolidatedAll
    ? 'Payments owned across the parent and all connected branches in the visible scope.'
    : isBranchVisible
      ? 'Payments directly owned by the selected branch.'
      : isParentVisible
        ? 'Payments directly owned by the selected parent.'
        : 'Payments directly owned by the selected agency.'

  const allocationLabel = isConsolidatedAll
    ? 'Total Allocated Across Family'
    : isBranchVisible
      ? 'Parent Payments Allocated to Branch'
      : isParentVisible
        ? 'Payments Allocated to Parent Groups'
        : 'Payments Allocated to Agency Groups'

  const allocatedToGroupsLabel = isConsolidatedAll
    ? 'Total Allocated Across Family'
    : isBranchVisible
      ? 'Total Allocated to Branch Groups'
      : isParentVisible
        ? 'Total Allocated to Parent Groups'
        : 'Total Allocated to Agency Groups'

  const advanceLabel = isConsolidatedAll
    ? 'Total Family Advance'
    : isBranchVisible
      ? 'Branch-Owned Advance Balance'
      : isParentVisible
        ? 'Parent-Owned Advance Balance'
        : 'Agency-Owned Advance Balance'

  const outstandingLabel = isConsolidatedAll
    ? 'Total Outstanding Across Family'
    : 'Outstanding Balance'

  const netBalanceLabel = isConsolidatedAll ? 'Net Family Balance' : 'Net Balance'

  return {
    isConsolidatedAll,
    visibleHierarchyType,
    directPaymentLabel,
    directPaymentDetail,
    allocationLabel,
    allocatedToGroupsLabel,
    advanceLabel,
    outstandingLabel,
    netBalanceLabel,
  }
}

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
  const [familyAgencyId, setFamilyAgencyId] = useState(searchParams.get('familyAgencyId') ?? '')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [paymentStatus, setPaymentStatus] = useState<
    '' | 'PENDING' | 'PARTIALLY_ALLOCATED' | 'ALLOCATED' | 'FAILED' | 'REFUNDED'
  >('')
  const [isDownloading, setIsDownloading] = useState<'' | 'excel' | 'pdf'>('')
  const { searchText, debouncedSearchText, updateSearchText } = useDebouncedSearch()
  const [agencySelectorOpen, setAgencySelectorOpen] = useState(false)
  const [agencySearchText, setAgencySearchText] = useState('')
  const [expandedParentIds, setExpandedParentIds] = useState<Record<string, boolean>>({})

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

  const selectedAgency =
    agencies.find((agency) => agency.id === selectedAgencyId) ?? null
  const selectedAgencyHierarchyType = selectedAgency ? getAgencyHierarchyType(selectedAgency) : null
  const canConsolidate = selectedAgencyHierarchyType === 'PARENT'

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
      if (familyAgencyId && includeBranches && canConsolidate) {
        next.set('familyAgencyId', familyAgencyId)
      } else {
        next.delete('familyAgencyId')
      }
      return next
    })
  }, [canConsolidate, familyAgencyId, includeBranches, selectedAgencyId, setSearchParams])

  useEffect(() => {
    if (!canConsolidate && includeBranches) {
      setIncludeBranches(false)
    }
  }, [canConsolidate, includeBranches])

  useEffect(() => {
    if (!canConsolidate || !includeBranches) {
      setFamilyAgencyId('')
    }
  }, [canConsolidate, includeBranches, selectedAgencyId])

  const reportQueryParams = useMemo(
    () => ({
      agencyId: selectedAgencyId || undefined,
      includeBranches: includeBranches && canConsolidate,
      familyAgencyId: includeBranches && canConsolidate ? familyAgencyId || undefined : undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      groupNumber: debouncedSearchText || undefined,
      paymentStatus: paymentStatus || undefined,
    }),
    [
      canConsolidate,
      dateFrom,
      dateTo,
      debouncedSearchText,
      familyAgencyId,
      includeBranches,
      paymentStatus,
      selectedAgencyId,
    ],
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
  const scopePresentation = getScopePresentation(report)
  const filteredAgencies = agencies.filter((agency) => {
    if (!agencySearchText.trim()) {
      return true
    }

    return buildAgencySearchText(agency).includes(agencySearchText.trim().toLowerCase())
  })
  const filteredParentAgencies = filteredAgencies.filter((agency) => getAgencyHierarchyType(agency) === 'PARENT')
  const filteredBranchAgencies = filteredAgencies.filter((agency) => getAgencyHierarchyType(agency) === 'BRANCH')
  const filteredStandaloneAgencies = filteredAgencies.filter(
    (agency) => getAgencyHierarchyType(agency) === 'STANDALONE',
  )
  const branchesByParentId = agencies.reduce<Record<string, AgencyListItem[]>>((total, agency) => {
    if (!agency.parentAgency?.id) {
      return total
    }

    total[agency.parentAgency.id] = [...(total[agency.parentAgency.id] ?? []), agency]
    return total
  }, {})
  const branchMatchParentIds = new Set(filteredBranchAgencies.map((branch) => branch.parentAgency?.id).filter(Boolean))
  const parentTreeOptions = agencies
    .filter((agency) => getAgencyHierarchyType(agency) === 'PARENT')
    .filter((parent) => {
      if (!agencySearchText.trim()) {
        return true
      }

      return filteredParentAgencies.some((agency) => agency.id === parent.id) || branchMatchParentIds.has(parent.id)
    })
    .map((parent) => {
      const parentMatched = filteredParentAgencies.some((agency) => agency.id === parent.id)
      const allBranches = branchesByParentId[parent.id] ?? []
      const visibleBranches =
        !agencySearchText.trim() || parentMatched
          ? allBranches
          : allBranches.filter((branch) => filteredBranchAgencies.some((item) => item.id === branch.id))

      return {
        parent,
        branches: visibleBranches,
      }
    })

  function openAgencyReport(
    agencyId: string,
    options?: {
      includeBranches?: boolean
      familyAgencyId?: string
    },
  ) {
    setSelectedAgencyId(agencyId)
    setIncludeBranches(options?.includeBranches ?? false)
    setFamilyAgencyId(options?.familyAgencyId ?? '')
    setAgencySelectorOpen(false)
  }

  const hierarchyParentId =
    report.agency.parentAgency?.id ?? report.agency.id
  const familyFilterOptions = [
    { value: '', label: 'All connected agencies' },
    {
      value: report.agency.id,
      label: `${report.agency.agencyName} (${report.agency.agentNumber})`,
    },
    ...report.agency.branches.map((branch) => ({
      value: branch.id,
      label: `${branch.agencyName} (${branch.agentNumber})`,
    })),
  ]
  const selectedParentId =
    selectedAgencyHierarchyType === 'BRANCH'
      ? selectedAgency?.parentAgency?.id ?? null
      : selectedAgencyHierarchyType === 'PARENT'
        ? selectedAgency?.id ?? null
        : null

  function isParentExpanded(parentId: string) {
    if (agencySearchText.trim()) {
      return true
    }

    return expandedParentIds[parentId] ?? selectedParentId === parentId
  }

  function toggleParentExpansion(parentId: string) {
    setExpandedParentIds((current) => ({
      ...current,
      [parentId]: !(current[parentId] ?? selectedParentId === parentId),
    }))
  }

  function isTreeSelectionActive(
    agencyId: string,
    selection: 'consolidated' | 'parent-only' | 'branch',
  ) {
    if (selection === 'consolidated') {
      return selectedAgencyId === agencyId && includeBranches
    }

    if (selection === 'parent-only') {
      return selectedAgencyId === agencyId && !includeBranches
    }

    return selectedAgencyId === agencyId && !includeBranches
  }

  return (
    <div className="space-y-6">
      <nav className="flex flex-wrap items-center gap-2 text-sm text-slate-300">
        <Link className="transition hover:text-cyan-200" to="/reports/agency">
          Agency Reports
        </Link>
        <span className="text-slate-500">{'>'}</span>
        {report.agency.parentAgency ? (
          <>
            <button
              className="transition hover:text-cyan-200"
              type="button"
              onClick={() =>
                openAgencyReport(report.agency.parentAgency?.id ?? report.agency.id, {
                  includeBranches: true,
                })
              }
            >
              {report.agency.parentAgency.agencyName}
            </button>
            <span className="text-slate-500">{'>'}</span>
            <span className="text-white">{report.agency.agencyName}</span>
          </>
        ) : report.agency.reportScope === 'CONSOLIDATED' ? (
          <>
            <button
              className="transition hover:text-cyan-200"
              type="button"
              onClick={() => openAgencyReport(report.agency.id, { includeBranches: false })}
            >
              {report.agency.agencyName}
            </button>
            <span className="text-slate-500">{'>'}</span>
            <span className="text-white">Consolidated</span>
          </>
        ) : (
          <span className="text-white">{report.agency.agencyName}</span>
        )}
      </nav>

      <PageHeader
        eyebrow={
          report.agency.reportScope === 'CONSOLIDATED'
            ? 'Consolidated parent reporting'
            : report.agency.hierarchyType === 'BRANCH'
              ? 'Dedicated branch reporting'
              : report.agency.hierarchyType === 'PARENT'
                ? 'Dedicated parent reporting'
                : 'Dedicated agency reporting'
        }
        title={
          report.agency.reportScope === 'CONSOLIDATED'
            ? report.agency.visibleAgencyFilter
              ? `Review ${report.agency.agencyName} with a filtered family scope`
              : 'Review a parent agency with all connected branch activity'
            : report.agency.hierarchyType === 'BRANCH'
              ? 'Review one branch across groups, allocations, and payment history'
              : 'Review one agency across groups, allocations, and payment history'
        }
        description={
          report.agency.reportScope === 'CONSOLIDATED'
            ? report.agency.visibleAgencyFilter
              ? `This parent report remains in consolidated mode while filtering the visible family data to ${report.agency.visibleAgencyFilter.agencyName}. Exports, print, totals, groups, and payment history all follow this exact scope.`
              : 'This consolidated report combines parent and branch groups, payments, allocations, and balances into one finance-ready view while preserving the underlying agency ledgers.'
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
        description="Use the same scoped filters for the agency summary, hierarchy, group details, payment history, print view, and export actions."
      >
        <div className="grid gap-4 md:grid-cols-6">
          {isSuperAdmin ? (
            <div className="block md:col-span-2">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                Travel agency
              </span>
              <div className="relative">
                <button
                  className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-[rgba(7,15,27,0.55)] px-4 py-3 text-left text-sm text-white outline-none transition hover:border-cyan-300/30 focus:border-cyan-300/50"
                  type="button"
                  onClick={() => setAgencySelectorOpen((current) => !current)}
                >
                  <span className="truncate">
                    {report ? getClosedSelectorLabel(report) : selectedAgency ? buildAgencyOptionLabel(selectedAgency) : 'Select an agency'}
                  </span>
                  <ChevronDown className="ml-3 h-4 w-4 shrink-0 text-slate-400" />
                </button>
                {agencySelectorOpen ? (
                  <div className="absolute z-20 mt-2 w-full rounded-[24px] border border-white/10 bg-[#09111d] p-3 shadow-panel">
                    <SearchInput
                      placeholder="Search by agency, code, or parent agency"
                      value={agencySearchText}
                      onChange={setAgencySearchText}
                    />
                    <div className="mt-3 max-h-80 space-y-3 overflow-y-auto pr-1">
                      {parentTreeOptions.length > 0 ? (
                        <div>
                          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                            Parent Agencies
                          </p>
                          <div className="space-y-2">
                            {parentTreeOptions.map(({ parent, branches }) => {
                              const expanded = isParentExpanded(parent.id)

                              return (
                                <div
                                  key={parent.id}
                                  className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3"
                                >
                                  <div className="flex items-start gap-2">
                                    {branches.length > 0 ? (
                                      <button
                                        className="mt-0.5 rounded-full p-1 text-slate-400 transition hover:bg-white/10 hover:text-white"
                                        type="button"
                                        onClick={(event) => {
                                          event.stopPropagation()
                                          toggleParentExpansion(parent.id)
                                        }}
                                      >
                                        <ChevronRight
                                          className={`h-4 w-4 transition ${expanded ? 'rotate-90' : ''}`}
                                        />
                                      </button>
                                    ) : (
                                      <span className="mt-0.5 h-6 w-6 shrink-0" />
                                    )}
                                    <div className="min-w-0 flex-1">
                                      <p className="font-semibold text-white">
                                        {buildAgencyBaseLabel(parent)} - Parent
                                      </p>
                                      <p className="mt-1 text-xs text-slate-300">
                                        {parent.city} • {parent.country}
                                      </p>
                                      {expanded ? (
                                        <div className="mt-3 space-y-2 border-l border-white/10 pl-3">
                                          <button
                                            className={`block w-full rounded-xl px-3 py-2 text-left text-sm transition ${
                                              isTreeSelectionActive(parent.id, 'consolidated')
                                                ? 'border border-cyan-300/40 bg-cyan-400/10 text-white'
                                                : 'border border-transparent bg-white/[0.02] text-slate-100 hover:border-cyan-300/20 hover:bg-white/[0.05]'
                                            }`}
                                            type="button"
                                            onClick={() => openAgencyReport(parent.id, { includeBranches: true })}
                                          >
                                            Consolidated Report
                                          </button>
                                          <button
                                            className={`block w-full rounded-xl px-3 py-2 text-left text-sm transition ${
                                              isTreeSelectionActive(parent.id, 'parent-only')
                                                ? 'border border-cyan-300/40 bg-cyan-400/10 text-white'
                                                : 'border border-transparent bg-white/[0.02] text-slate-100 hover:border-cyan-300/20 hover:bg-white/[0.05]'
                                            }`}
                                            type="button"
                                            onClick={() => openAgencyReport(parent.id, { includeBranches: false })}
                                          >
                                            Parent Only
                                          </button>
                                          {branches.map((branch) => (
                                            <button
                                              key={branch.id}
                                              className={`block w-full rounded-xl px-3 py-2 text-left text-sm transition ${
                                                isTreeSelectionActive(branch.id, 'branch')
                                                  ? 'border border-cyan-300/40 bg-cyan-400/10 text-white'
                                                  : 'border border-transparent bg-white/[0.02] text-slate-100 hover:border-cyan-300/20 hover:bg-white/[0.05]'
                                              }`}
                                              type="button"
                                              onClick={() => openAgencyReport(branch.id)}
                                            >
                                              <span className="block text-white">
                                                {buildAgencyBaseLabel(branch)} - Branch
                                              </span>
                                              <span className="mt-1 block text-xs text-slate-300">
                                                Branch of {parent.name}
                                              </span>
                                            </button>
                                          ))}
                                        </div>
                                      ) : null}
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      ) : null}
                      {filteredStandaloneAgencies.length > 0 ? (
                        <div>
                          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                            Standalone Agencies
                          </p>
                          <div className="space-y-2">
                            {filteredStandaloneAgencies.map((agency) => (
                              <button
                                key={agency.id}
                                className={`w-full rounded-2xl border px-3 py-3 text-left text-sm transition ${
                                  selectedAgencyId === agency.id && !includeBranches
                                    ? 'border-cyan-300/40 bg-cyan-400/10 text-white'
                                    : 'border-white/10 bg-white/[0.03] text-slate-100 hover:border-cyan-300/30 hover:bg-white/[0.06]'
                                }`}
                                type="button"
                                onClick={() => openAgencyReport(agency.id)}
                              >
                                <p className="font-semibold">{buildAgencyBaseLabel(agency)}</p>
                                <p className="mt-1 text-xs text-slate-300">Standalone agency</p>
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}
                      {parentTreeOptions.length === 0 && filteredStandaloneAgencies.length === 0 ? (
                        <p className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-4 text-sm text-slate-300">
                          No agencies match this search.
                        </p>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
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

          <label className="block md:col-span-2">
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
              value={
                report.agency.hierarchyType === 'BRANCH'
                  ? 'branch-only'
                  : report.agency.hierarchyType === 'STANDALONE'
                    ? 'agency-only'
                    : includeBranches
                      ? 'consolidated'
                      : 'parent-only'
              }
              onChange={(event) => {
                setIncludeBranches(event.target.value === 'consolidated')
                if (event.target.value !== 'consolidated') {
                  setFamilyAgencyId('')
                }
              }}
              disabled={!canConsolidate}
            >
              {report.agency.hierarchyType === 'PARENT' ? (
                <>
                  <option value="parent-only">Parent Only</option>
                  <option value="consolidated">Parent + Branches - Consolidated</option>
                </>
              ) : report.agency.hierarchyType === 'BRANCH' ? (
                <option value="branch-only">Selected Branch Only</option>
              ) : (
                <option value="agency-only">Selected Agency Only</option>
              )}
            </select>
          </label>

          {report.agency.hierarchyType === 'PARENT' ? (
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                Agency within family
              </span>
              <select
                className="w-full rounded-2xl border border-white/10 bg-[rgba(7,15,27,0.55)] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/50 disabled:opacity-60"
                value={familyAgencyId}
                onChange={(event) => setFamilyAgencyId(event.target.value)}
                disabled={!includeBranches}
              >
                {familyFilterOptions.map((option) => (
                  <option key={option.value || 'all'} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

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
              {` • ${report.agency.scopeLabel}`}
              {report.filters.groupNumber ? ` • ${report.filters.groupNumber}` : ' • All groups'}
              {report.filters.paymentStatus
                ? ` • ${report.filters.paymentStatus.replace(/_/g, ' ')}`
                : ' • All payment statuses'}
              {report.agency.visibleAgencyFilter
                ? ` • Filtered to ${report.agency.visibleAgencyFilter.agencyName}`
                : ''}
            </p>
          </div>
        </div>
      </Panel>

      <Panel
        title="Hierarchy and Scope"
        description="Review the current agency context and switch between consolidated, parent-only, and branch reports from one hierarchy section."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[22px] border border-white/10 bg-[rgba(7,15,27,0.45)] px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Agency</p>
            <p className="mt-3 text-sm font-semibold text-white">{report.agency.agencyName}</p>
          </div>
          <div className="rounded-[22px] border border-white/10 bg-[rgba(7,15,27,0.45)] px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Type</p>
            <p className="mt-3 text-sm font-semibold text-white">
              {report.agency.hierarchyType === 'PARENT'
                ? 'Parent'
                : report.agency.hierarchyType === 'BRANCH'
                  ? 'Branch'
                  : 'Standalone'}
            </p>
          </div>
          <div className="rounded-[22px] border border-white/10 bg-[rgba(7,15,27,0.45)] px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              {report.agency.parentAgency ? 'Parent Agency' : 'Hierarchy'}
            </p>
            {report.agency.parentAgency ? (
              <button
                className="mt-3 text-left text-sm font-semibold text-cyan-200 transition hover:text-cyan-100"
                type="button"
                onClick={() =>
                  openAgencyReport(report.agency.parentAgency?.id ?? hierarchyParentId, {
                    includeBranches: true,
                  })
                }
              >
                {report.agency.parentAgency.agencyName}
              </button>
            ) : (
              <p className="mt-3 text-sm font-semibold text-white">Top-level agency</p>
            )}
          </div>
          <div className="rounded-[22px] border border-white/10 bg-[rgba(7,15,27,0.45)] px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Current Scope</p>
            <p className="mt-3 text-sm font-semibold text-white">{report.agency.scopeLabel}</p>
          </div>
        </div>

        {report.agency.hierarchyType === 'PARENT' ? (
          <div className="mt-4 rounded-[22px] border border-white/10 bg-[rgba(7,15,27,0.35)] px-4 py-4">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-white">
                {report.agency.agencyName} ({report.agency.agentNumber})
              </p>
              <div className="space-y-2 border-l border-white/10 pl-3">
                <button
                  className={`block w-full rounded-xl px-3 py-2 text-left text-sm transition ${
                    isTreeSelectionActive(report.agency.id, 'consolidated')
                      ? 'border border-cyan-300/40 bg-cyan-400/10 text-white'
                      : 'border border-transparent bg-white/[0.02] text-slate-100 hover:border-cyan-300/20 hover:bg-white/[0.05]'
                  }`}
                  type="button"
                  onClick={() => openAgencyReport(report.agency.id, { includeBranches: true })}
                >
                  Consolidated Report
                </button>
                <button
                  className={`block w-full rounded-xl px-3 py-2 text-left text-sm transition ${
                    isTreeSelectionActive(report.agency.id, 'parent-only')
                      ? 'border border-cyan-300/40 bg-cyan-400/10 text-white'
                      : 'border border-transparent bg-white/[0.02] text-slate-100 hover:border-cyan-300/20 hover:bg-white/[0.05]'
                  }`}
                  type="button"
                  onClick={() => openAgencyReport(report.agency.id, { includeBranches: false })}
                >
                  Parent Only
                </button>
                {report.agency.branches.map((branch) => (
                  <button
                    key={branch.id}
                    className={`block w-full rounded-xl px-3 py-2 text-left text-sm transition ${
                      isTreeSelectionActive(branch.id, 'branch')
                        ? 'border border-cyan-300/40 bg-cyan-400/10 text-white'
                        : 'border border-transparent bg-white/[0.02] text-slate-100 hover:border-cyan-300/20 hover:bg-white/[0.05]'
                    }`}
                    type="button"
                    onClick={() => openAgencyReport(branch.id)}
                  >
                    {branch.agencyName} ({branch.agentNumber}) - Branch
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </Panel>

      <div className="grid gap-4 xl:grid-cols-4">
        {[
          {
            label: 'Agency name',
            value: report.agency.agencyName,
            detail: `${report.agency.country} • ${report.agency.city}`,
          },
          {
            label: 'Report scope',
            value: report.agency.scopeLabel,
            detail: `${formatNumber(report.businessSummary.totalGroups)} groups in the visible report scope.`,
          },
          {
            label: scopePresentation.directPaymentLabel,
            value: formatCurrency(report.businessSummary.totalPaymentsReceived),
            detail: scopePresentation.directPaymentDetail,
          },
          {
            label: scopePresentation.netBalanceLabel,
            value: formatCurrency(report.businessSummary.netBalance),
            detail:
              report.agency.reportScope === 'CONSOLIDATED'
                ? 'Outstanding amount after family-owned advance is deducted across the visible family scope.'
                : 'Outstanding amount after agency-owned advance balance is deducted.',
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
            [scopePresentation.directPaymentLabel, formatCurrency(report.businessSummary.totalPaymentsReceived)],
            ...(scopePresentation.isConsolidatedAll
              ? [
                  ['Parent-Owned Payments', formatCurrency(report.businessSummary.parentOwnedPayments)],
                  ['Branch-Owned Payments', formatCurrency(report.businessSummary.branchOwnedPayments)],
                ]
              : [[scopePresentation.allocationLabel, formatCurrency(report.businessSummary.parentPaymentsAllocatedToAgency)]]),
            [scopePresentation.allocatedToGroupsLabel, formatCurrency(report.businessSummary.totalAllocatedToGroups)],
            [scopePresentation.outstandingLabel, formatCurrency(report.businessSummary.outstandingBalance)],
            [scopePresentation.advanceLabel, formatCurrency(report.businessSummary.agencyOwnedAdvanceBalance)],
            [scopePresentation.netBalanceLabel, formatCurrency(report.businessSummary.netBalance)],
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
          description="Each group shows hierarchy-aware navigation, passenger volume, price per pax, amount, and derived payment status."
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
                  className="grid gap-3 rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-center"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        className="text-sm font-semibold text-cyan-200 transition hover:text-cyan-100"
                        to={`/groups/${group.groupId}`}
                      >
                        {group.groupNumber}
                      </Link>
                      <button
                        className="text-xs uppercase tracking-[0.18em] text-slate-300 transition hover:text-cyan-200"
                        type="button"
                        onClick={() =>
                          openAgencyReport(group.agencyId, {
                            includeBranches:
                              agencies.find((agency) => agency.id === group.agencyId)?.branchCount
                                ? true
                                : false,
                          })
                        }
                      >
                        {group.agencyCode}
                      </button>
                      <button
                        className="text-sm text-slate-300 transition hover:text-cyan-200"
                        type="button"
                        onClick={() =>
                          openAgencyReport(group.agencyId, {
                            includeBranches:
                              agencies.find((agency) => agency.id === group.agencyId)?.branchCount
                                ? true
                                : false,
                          })
                        }
                      >
                        {group.agencyName}
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-slate-300">
                      {formatNumber(group.numberOfPax)} pax • {formatCurrency(group.pricePerPax)} / pax
                    </p>
                  </div>
                  <p className="text-right text-sm font-semibold text-white lg:min-w-[110px]">
                    {formatCurrency(group.groupAmount)}
                  </p>
                  <div className="lg:min-w-[160px] lg:text-right">
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
              ['Total Group Amount', report.calculations.totalGroupAmount],
              [scopePresentation.directPaymentLabel, report.calculations.directPaymentsByAgency],
              ...(scopePresentation.isConsolidatedAll
                ? [
                    ['Parent-Owned Payments', report.calculations.parentOwnedPayments],
                    ['Branch-Owned Payments', report.calculations.branchOwnedPayments],
                  ]
                : [[scopePresentation.allocationLabel, report.calculations.parentPaymentsAllocatedToAgency]]),
              [scopePresentation.allocatedToGroupsLabel, report.calculations.totalAllocatedToGroups],
              [scopePresentation.outstandingLabel, report.calculations.outstandingBalance],
              [scopePresentation.advanceLabel, report.calculations.agencyOwnedAdvanceBalance],
              [scopePresentation.netBalanceLabel, report.calculations.netBalance],
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
        description="Each payment now separates header, ownership, allocation, and remaining-balance context so users can read ownership clearly."
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
                <div className="flex flex-col gap-4 rounded-[18px] border border-white/10 bg-[rgba(7,15,27,0.35)] px-4 py-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">{payment.reference}</p>
                    <p className="mt-1 text-sm text-slate-300">
                      {formatDate(payment.paymentDate)} • Source payment amount{' '}
                      {formatCurrency(payment.sourcePaymentAmount)}
                    </p>
                    <p className="mt-1 text-sm text-slate-300">
                      {payment.paymentCity} • {payment.receivedBy} •{' '}
                      {payment.paymentMethod.replace(/_/g, ' ')}
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
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-[18px] border border-white/10 bg-[rgba(7,15,27,0.35)] px-3 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Ownership</p>
                    <p className="mt-2 text-sm text-white">
                      {payment.paidByAgencyName === payment.remainingBalanceOwnerAgencyName || payment.remainingSourceBalance <= 0 ? (
                        <>
                          Paid by / Owner: <span className="font-semibold">{payment.paidByAgencyName}</span>
                        </>
                      ) : (
                        <>
                          Paid by: <span className="font-semibold">{payment.paidByAgencyName}</span>
                        </>
                      )}
                    </p>
                    {payment.paidByAgencyName !== payment.remainingBalanceOwnerAgencyName &&
                    payment.remainingSourceBalance > 0 ? (
                      <p className="mt-1 text-sm text-white">
                        Payment owner: <span className="font-semibold">{payment.paidByAgencyName}</span>
                      </p>
                    ) : null}
                    <p className="mt-1 text-sm text-white">
                      {payment.remainingSourceBalance > 0 ? (
                        <>
                          Remaining balance: <span className="font-semibold">{formatCurrency(payment.remainingSourceBalance)}</span>{' '}
                          — Owned by <span className="font-semibold">{payment.remainingBalanceOwnerAgencyName}</span>
                        </>
                      ) : (
                        'No remaining balance'
                      )}
                    </p>
                  </div>
                  <div className="rounded-[18px] border border-white/10 bg-[rgba(7,15,27,0.35)] px-3 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Allocation</p>
                    <p className="mt-2 text-sm text-white">
                      Allocated to visible scope:{' '}
                      <span className="font-semibold">{formatCurrency(payment.allocatedToVisibleScope)}</span>
                    </p>
                    <p className="mt-1 text-sm text-white">
                      Total allocated:{' '}
                      <span className="font-semibold">{formatCurrency(payment.totalAllocatedAmount)}</span>
                    </p>
                    <p className="mt-1 text-sm text-white">
                      Remaining source balance:{' '}
                      <span className="font-semibold">{formatCurrency(payment.remainingSourceBalance)}</span>
                    </p>
                  </div>
                  <div className="rounded-[18px] border border-white/10 bg-[rgba(7,15,27,0.35)] px-3 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Allocated Groups</p>
                    {payment.paymentGroups.length > 0 ? (
                      <div className="mt-2 space-y-2">
                        {payment.paymentGroups.map((group) => (
                          <div key={`${payment.id}-${group.groupId}`} className="text-sm text-white">
                            <button
                              className="font-semibold text-cyan-200 transition hover:text-cyan-100"
                              type="button"
                              onClick={() => openAgencyReport(group.agencyId)}
                            >
                              {group.agencyCode}
                            </button>{' '}
                            <Link
                              className="font-semibold text-cyan-200 transition hover:text-cyan-100"
                              to={`/groups/${group.groupId}`}
                            >
                              {group.groupNumber}
                            </Link>{' '}
                            • {formatCurrency(group.allocatedAmount)}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-slate-300">No allocations</p>
                    )}
                  </div>
                </div>
                {payment.remarks !== '-' ? (
                  <p className="mt-4 text-sm text-slate-300">Remarks: {payment.remarks}</p>
                ) : null}
              </div>
            ))
          )}
        </div>
      </Panel>
    </div>
  )
}
