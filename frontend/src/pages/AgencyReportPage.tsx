import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, Download, FileSpreadsheet, Printer, ShieldAlert } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { AgencySelectorTreeList } from '@/components/reports/AgencySelectorTreeList'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingBlock } from '@/components/ui/LoadingBlock'
import { Panel } from '@/components/ui/Panel'
import { PortalSurface } from '@/components/ui/PortalSurface'
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
type SelectorOption = {
  key: string
  agencyId: string
  selection: 'consolidated' | 'parent-only' | 'branch' | 'standalone'
  includeBranches: boolean
  label: string
  meta: string
}

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

function buildAgencyBaseLabel(agency: AgencyListItem) {
  return `${agency.name} (${agency.code})`
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

function formatNetBalanceSummary(value: number) {
  if (value < 0) {
    return `${formatCurrency(Math.abs(value))} credit`
  }

  if (value > 0) {
    return `${formatCurrency(value)} outstanding`
  }

  return 'Settled'
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
  const [expandedPaymentIds, setExpandedPaymentIds] = useState<Record<string, boolean>>({})
  const [activeSelectorOptionKey, setActiveSelectorOptionKey] = useState<string | null>(null)
  const [selectorPosition, setSelectorPosition] = useState({
    top: 0,
    left: 0,
    width: 360,
    maxHeight: 420,
  })
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const optionRefs = useRef<Record<string, HTMLButtonElement | null>>({})

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
  const selectedParentId =
    selectedAgencyHierarchyType === 'BRANCH'
      ? selectedAgency?.parentAgency?.id ?? null
      : selectedAgencyHierarchyType === 'PARENT'
        ? selectedAgency?.id ?? null
        : null

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
  const selectorOptions = useMemo(() => {
    const options: SelectorOption[] = []
    const isSearchActive = agencySearchText.trim().length > 0

    parentTreeOptions.forEach(({ parent, branches }) => {
      const expanded = isSearchActive ? true : (expandedParentIds[parent.id] ?? selectedParentId === parent.id)
      if (!expanded) {
        return
      }

      options.push({
        key: `${parent.id}-consolidated`,
        agencyId: parent.id,
        selection: 'consolidated',
        includeBranches: true,
        label: 'Consolidated Report',
        meta: `${buildAgencyBaseLabel(parent)} · Parent family`,
      })
      options.push({
        key: `${parent.id}-parent-only`,
        agencyId: parent.id,
        selection: 'parent-only',
        includeBranches: false,
        label: 'Parent Only',
        meta: `${buildAgencyBaseLabel(parent)} · Parent only`,
      })

      branches.forEach((branch) => {
        options.push({
          key: `${branch.id}-branch`,
          agencyId: branch.id,
          selection: 'branch',
          includeBranches: false,
          label: buildAgencyBaseLabel(branch),
          meta: `Branch of ${parent.name}`,
        })
      })
    })

    filteredStandaloneAgencies.forEach((agency) => {
      options.push({
        key: `${agency.id}-standalone`,
        agencyId: agency.id,
        selection: 'standalone',
        includeBranches: false,
        label: buildAgencyBaseLabel(agency),
        meta: 'Standalone agency',
      })
    })

    return options
  }, [agencySearchText, expandedParentIds, filteredStandaloneAgencies, parentTreeOptions, selectedParentId])

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
    setAgencySearchText('')
    setAgencySelectorOpen(false)
  }

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

  const currentSelectionKey = useMemo(() => {
    if (!selectedAgencyId) {
      return null
    }

    if (includeBranches) {
      return `${selectedAgencyId}-consolidated`
    }

    if (selectedAgencyHierarchyType === 'PARENT') {
      return `${selectedAgencyId}-parent-only`
    }

    if (selectedAgencyHierarchyType === 'BRANCH') {
      return `${selectedAgencyId}-branch`
    }

    return `${selectedAgencyId}-standalone`
  }, [includeBranches, selectedAgencyHierarchyType, selectedAgencyId])

  function updateSelectorPosition() {
    if (!triggerRef.current || typeof window === 'undefined') {
      return
    }

    const rect = triggerRef.current.getBoundingClientRect()
    const viewportPadding = 12
    const availableBelow = window.innerHeight - rect.bottom - viewportPadding
    const availableAbove = rect.top - viewportPadding
    const renderAbove = availableBelow < 320 && availableAbove > availableBelow
    const maxHeight = Math.max(240, Math.min(480, (renderAbove ? availableAbove : availableBelow) - 8))
    const width = Math.min(Math.max(rect.width, 360), window.innerWidth - viewportPadding * 2)
    const left = Math.min(
      Math.max(rect.left, viewportPadding),
      window.innerWidth - width - viewportPadding,
    )
    const top = renderAbove
      ? Math.max(viewportPadding, rect.top - maxHeight - 8)
      : Math.min(window.innerHeight - maxHeight - viewportPadding, rect.bottom + 8)

    setSelectorPosition({
      top,
      left,
      width,
      maxHeight,
    })
  }

  useEffect(() => {
    if (!agencySelectorOpen) {
      return
    }

    updateSelectorPosition()
    setActiveSelectorOptionKey(
      selectorOptions.some((option) => option.key === currentSelectionKey)
        ? currentSelectionKey
        : selectorOptions[0]?.key ?? null,
    )

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null

      if (
        target &&
        !menuRef.current?.contains(target) &&
        !triggerRef.current?.contains(target)
      ) {
        setAgencySearchText('')
        setAgencySelectorOpen(false)
      }
    }

    const handleViewportChange = () => {
      updateSelectorPosition()
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setAgencySearchText('')
        setAgencySelectorOpen(false)
        triggerRef.current?.focus()
        return
      }

      if (selectorOptions.length === 0) {
        return
      }

      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault()
        const currentIndex = selectorOptions.findIndex((option) => option.key === activeSelectorOptionKey)
        const nextIndex =
          event.key === 'ArrowDown'
            ? (currentIndex + 1 + selectorOptions.length) % selectorOptions.length
            : (currentIndex - 1 + selectorOptions.length) % selectorOptions.length
        setActiveSelectorOptionKey(selectorOptions[nextIndex]?.key ?? null)
      }

      if (event.key === 'Enter' && activeSelectorOptionKey) {
        const selectedOption = selectorOptions.find((option) => option.key === activeSelectorOptionKey)
        if (selectedOption) {
          event.preventDefault()
          openAgencyReport(selectedOption.agencyId, {
            includeBranches: selectedOption.includeBranches,
          })
        }
      }
    }

    document.addEventListener('mousedown', handlePointerDown, true)
    window.addEventListener('resize', handleViewportChange)
    window.addEventListener('scroll', handleViewportChange, true)
    document.addEventListener('keydown', handleKeyDown)

    const frameId = window.requestAnimationFrame(() => {
      searchInputRef.current?.focus()
    })

    return () => {
      document.removeEventListener('mousedown', handlePointerDown, true)
      window.removeEventListener('resize', handleViewportChange)
      window.removeEventListener('scroll', handleViewportChange, true)
      document.removeEventListener('keydown', handleKeyDown)
      window.cancelAnimationFrame(frameId)
    }
  }, [activeSelectorOptionKey, agencySelectorOpen, currentSelectionKey, selectorOptions])

  useEffect(() => {
    if (!agencySelectorOpen || !activeSelectorOptionKey) {
      return
    }

    optionRefs.current[activeSelectorOptionKey]?.scrollIntoView({
      block: 'nearest',
    })
  }, [activeSelectorOptionKey, agencySelectorOpen])

  useEffect(() => {
    if (agencySelectorOpen) {
      updateSelectorPosition()
    }
  }, [agencySearchText, expandedParentIds, agencySelectorOpen])

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

  const selectorMenu =
    agencySelectorOpen && typeof document !== 'undefined'
      ? (
          <PortalSurface>
          <div
            ref={menuRef}
            className="fixed z-[200] overflow-hidden rounded-[24px] border border-white/10 bg-[rgba(7,15,27,0.98)] p-3 shadow-panel backdrop-blur"
            style={{
              top: selectorPosition.top,
              left: selectorPosition.left,
              width: selectorPosition.width,
            }}
            role="dialog"
            aria-label="Travel agency selector"
          >
            <AgencySelectorTreeList
              searchInputRef={searchInputRef}
              optionRefs={optionRefs}
              searchText={agencySearchText}
              onSearchTextChange={setAgencySearchText}
              maxHeight={selectorPosition.maxHeight - 76}
              parentTreeOptions={parentTreeOptions}
              filteredStandaloneAgencies={filteredStandaloneAgencies}
              activeOptionKey={activeSelectorOptionKey}
              selectedAgencyId={selectedAgencyId}
              includeBranches={includeBranches}
              onActiveOptionChange={setActiveSelectorOptionKey}
              onToggleParent={toggleParentExpansion}
              isParentExpanded={isParentExpanded}
              isTreeSelectionActive={isTreeSelectionActive}
              onSelect={openAgencyReport}
            />
          </div>
          </PortalSurface>
        )
      : null

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
          report.agency.agencyName
        }
        description={
          report.agency.reportScope === 'CONSOLIDATED'
            ? report.agency.visibleAgencyFilter
              ? `Filtered to ${report.agency.visibleAgencyFilter.agencyName}. Exports, print, totals, groups, and payment history follow this exact visible scope.`
              : 'Consolidated agency reporting with preserved payment ownership and branch-level visibility.'
            : 'Single-agency reporting with preserved payment ownership and export-ready scope.'
        }
        action={
          <div className="flex flex-wrap items-center gap-2">
            <button
              className="app-button-secondary"
              type="button"
              onClick={() => window.print()}
            >
              <Printer className="h-4 w-4" />
              Print report
            </button>
            <button
              className="app-button-secondary"
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
              className="app-button-secondary"
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
        description="Agency, scope, date, and status filters stay synchronized with the visible report, print view, and exports."
      >
        <div className="grid gap-4 xl:grid-cols-12">
          {isSuperAdmin ? (
            <div className="block xl:col-span-4">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                Travel agency
              </span>
              <div>
                <button
                  ref={triggerRef}
                  className="app-field flex items-center justify-between gap-3 text-left"
                  type="button"
                  onClick={() =>
                    setAgencySelectorOpen((current) => {
                      if (current) {
                        setAgencySearchText('')
                      }
                      return !current
                    })
                  }
                  aria-expanded={agencySelectorOpen}
                  aria-haspopup="dialog"
                >
                  <span className="truncate">
                    {report ? getClosedSelectorLabel(report) : selectedAgency ? buildAgencyOptionLabel(selectedAgency) : 'Select an agency'}
                  </span>
                  <ChevronDown className="ml-3 h-4 w-4 shrink-0 text-slate-400" />
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-[24px] border border-cyan-300/20 bg-cyan-400/10 p-4 xl:col-span-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-100">
                Agency scope
              </p>
              <p className="mt-3 text-sm text-slate-100">
                {selectedAgency?.name ?? report.agency.agencyName}
              </p>
            </div>
          )}

          <label className="block md:col-span-2 xl:col-span-3">
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
              className="app-field"
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
            <label className="block xl:col-span-2">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                Agency within family
              </span>
              <select
                className="app-field disabled:opacity-60"
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

          <label className="block xl:col-span-2">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              Payment status
            </span>
            <select
              className="app-field"
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

          <div className="rounded-[22px] border border-white/10 bg-white/[0.04] px-4 py-3 xl:col-span-12">
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-200">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                Filter Summary
              </span>
              <span>{report.agency.agencyName}</span>
              <span className="text-slate-500">•</span>
              <span>{report.agency.scopeLabel}</span>
              <span className="text-slate-500">•</span>
              <span>{report.filters.groupNumber ? report.filters.groupNumber : 'All groups'}</span>
              <span className="text-slate-500">•</span>
              <span>
                {report.filters.paymentStatus
                  ? report.filters.paymentStatus.replace(/_/g, ' ')
                  : 'All payment statuses'}
              </span>
              {report.agency.visibleAgencyFilter ? (
                <>
                  <span className="text-slate-500">•</span>
                  <span>Filtered to {report.agency.visibleAgencyFilter.agencyName}</span>
                </>
              ) : null}
              <button
                className="app-button-secondary ml-auto"
                type="button"
                onClick={() => {
                  setDateFrom('')
                  setDateTo('')
                  setPaymentStatus('')
                  updateSearchText('')
                  setAgencySearchText('')
                  setFamilyAgencyId('')
                }}
              >
                Reset Filters
              </button>
            </div>
          </div>
        </div>
      </Panel>

      <Panel
        title="Agency Hierarchy & Report Scope"
        description="Use one hierarchy card to understand the selected agency, current reporting scope, and connected parent or branch navigation."
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
            label: 'Visible Agencies',
            value: formatNumber(report.agency.visibleAgencyIds.length),
            detail:
              report.agency.reportScope === 'CONSOLIDATED'
                ? 'Parent and connected branches currently included in this report.'
                : 'Single visible agency in the current report scope.',
          },
          {
            label: 'Total Groups',
            value: formatNumber(report.businessSummary.totalGroups),
            detail: `${formatNumber(report.businessSummary.totalPassengers)} passengers in the visible report scope.`,
          },
          {
            label: scopePresentation.directPaymentLabel,
            value: formatCurrency(report.businessSummary.totalPaymentsReceived),
            detail: scopePresentation.directPaymentDetail,
          },
          {
            label: scopePresentation.netBalanceLabel,
            value: formatNetBalanceSummary(report.businessSummary.netBalance),
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
            <p className="mt-4 text-2xl font-semibold text-white [font-variant-numeric:tabular-nums]">{metric.value}</p>
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
              compact
              />
            ) : (
            <>
              <div className="hidden lg:block">
                <div className="app-table-wrap">
                  <table className="min-w-full divide-y divide-white/10 text-sm">
                    <thead className="bg-white/[0.03]">
                      <tr className="text-left text-[11px] uppercase tracking-[0.18em] text-slate-400">
                        <th className="px-4 py-3">Group</th>
                        <th className="px-4 py-3">Agency</th>
                        <th className="px-4 py-3 text-right">Passengers</th>
                        <th className="px-4 py-3 text-right">Price/Pax</th>
                        <th className="px-4 py-3 text-right">Group Amount</th>
                        <th className="px-4 py-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {report.groupDetails.map((group) => (
                        <tr key={group.groupId} className="bg-white/[0.02]">
                          <td className="px-4 py-3">
                            <Link
                              className="font-semibold text-cyan-200 transition hover:text-cyan-100"
                              to={`/groups/${group.groupId}`}
                            >
                              {group.groupNumber}
                            </Link>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap items-center gap-2">
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
                                className="text-sm text-slate-200 transition hover:text-cyan-200"
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
                          </td>
                          <td className="px-4 py-3 text-right text-slate-200 [font-variant-numeric:tabular-nums]">
                            {formatNumber(group.numberOfPax)}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-200 [font-variant-numeric:tabular-nums]">
                            {formatCurrency(group.pricePerPax)}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-white [font-variant-numeric:tabular-nums]">
                            {formatCurrency(group.groupAmount)}
                          </td>
                          <td className="px-4 py-3 text-right">
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
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="grid gap-3 lg:hidden">
                {report.groupDetails.map((group) => (
                  <div
                    key={group.groupId}
                    className="rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3"
                  >
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
                    </div>
                    <button
                      className="mt-1 text-left text-sm text-slate-200 transition hover:text-cyan-200"
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
                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Passengers</p>
                        <p className="mt-1 text-white">{formatNumber(group.numberOfPax)}</p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Price / Pax</p>
                        <p className="mt-1 text-white">{formatCurrency(group.pricePerPax)}</p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Group Amount</p>
                        <p className="mt-1 font-semibold text-white">{formatCurrency(group.groupAmount)}</p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Status</p>
                        <div className="mt-1">
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
                    </div>
                  </div>
                ))}
              </div>
            </>
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
                {(() => {
                  const allocationsExpanded = expandedPaymentIds[payment.id] ?? false

                  return (
                    <>
                <div className="flex flex-col gap-4 rounded-[18px] border border-white/10 bg-[rgba(7,15,27,0.35)] px-4 py-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">{payment.reference}</p>
                    <p className="mt-1 text-sm text-slate-300">
                      {formatDate(payment.paymentDate)} • {payment.paymentMethod.replace(/_/g, ' ')} • Paid by{' '}
                      {payment.paidByAgencyCode}
                    </p>
                    <p className="mt-1 text-sm text-slate-300">
                      {payment.paymentCity} • {payment.receivedBy}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-white [font-variant-numeric:tabular-nums]">
                      {formatCurrency(payment.sourcePaymentAmount)}
                    </p>
                    <div className="mt-2 flex justify-end">
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
                      <>
                        <button
                          className="mt-2 text-sm font-semibold text-cyan-200 transition hover:text-cyan-100"
                          type="button"
                          onClick={() =>
                            setExpandedPaymentIds((current) => ({
                              ...current,
                              [payment.id]: !allocationsExpanded,
                            }))
                          }
                        >
                          {allocationsExpanded
                            ? 'Hide allocations'
                            : `View ${payment.paymentGroups.length} allocations`}
                        </button>
                        {allocationsExpanded ? (
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
                        ) : null}
                      </>
                    ) : (
                      <p className="mt-2 text-sm text-slate-300">No allocations</p>
                    )}
                  </div>
                </div>
                {payment.remarks !== '-' ? (
                  <div className="mt-4 rounded-[18px] border border-white/10 bg-[rgba(7,15,27,0.28)] px-3 py-3 text-sm text-slate-300">
                    Remarks: {payment.remarks}
                  </div>
                ) : null}
                    </>
                  )
                })()}
              </div>
            ))
          )}
        </div>
      </Panel>
      {selectorMenu}
    </div>
  )
}
