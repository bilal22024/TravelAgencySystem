import { useEffect, useMemo, useState } from 'react'
import { Archive, Building2, Eye, FilterX, Pencil, ShieldAlert, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAgenciesQuery } from '@/features/agencies/api'
import {
  useDeleteGroupMutation,
  useGroupsQuery,
  useUpdateGroupMutation,
} from '@/features/groups/api'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingBlock } from '@/components/ui/LoadingBlock'
import { PaginationControls } from '@/components/ui/PaginationControls'
import { Panel } from '@/components/ui/Panel'
import { SearchInput } from '@/components/ui/SearchInput'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { getApiErrorMessage } from '@/lib/api-client'
import { formatCurrency, formatDate, formatNumber } from '@/lib/format'

const pageSizeOptions = [10, 25, 50, 100, 250, 500] as const

function normalizeAgencyField(value: string | null | undefined) {
  return value?.trim() || 'Not assigned'
}

function normalizeSearchValue(value: string) {
  return value.trim()
}

function getFinancialTone(status: string | undefined) {
  switch (status) {
    case 'FULLY_PAID':
      return 'success' as const
    case 'PARTIALLY_PAID':
      return 'warning' as const
    case 'UNPAID':
      return 'danger' as const
    default:
      return 'neutral' as const
  }
}

function getLifecycleTone(status: string) {
  switch (status) {
    case 'COMPLETED':
      return 'success' as const
    case 'IN_PROGRESS':
      return 'info' as const
    case 'CANCELLED':
      return 'warning' as const
    default:
      return 'neutral' as const
  }
}

type GroupFilterState = {
  search: string
  selectedCountry: string
  selectedCity: string
  selectedAgencyId: string
  groupStatus: '' | 'PLANNED' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  paymentStatus: '' | 'UNPAID' | 'PARTIALLY_PAID' | 'FULLY_PAID'
  minPassengers: string
  maxPassengers: string
  minAmount: string
  maxAmount: string
  createdDateFrom: string
  createdDateTo: string
  sortBy:
    | 'createdAt'
    | 'code'
    | 'name'
    | 'agencyName'
    | 'country'
    | 'travelerCount'
    | 'amountPerPax'
    | 'totalAmount'
    | 'outstandingBalance'
  sortOrder: 'asc' | 'desc'
}

const defaultGroupFilters: GroupFilterState = {
  search: '',
  selectedCountry: '',
  selectedCity: '',
  selectedAgencyId: '',
  groupStatus: '',
  paymentStatus: '',
  minPassengers: '',
  maxPassengers: '',
  minAmount: '',
  maxAmount: '',
  createdDateFrom: '',
  createdDateTo: '',
  sortBy: 'createdAt',
  sortOrder: 'desc',
}

export function GroupsPage() {
  const [pendingFilters, setPendingFilters] = useState<GroupFilterState>(defaultGroupFilters)
  const [appliedFilters, setAppliedFilters] = useState<GroupFilterState>(defaultGroupFilters)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<(typeof pageSizeOptions)[number]>(25)
  const [actionMessage, setActionMessage] = useState('')
  const [actionErrorMessage, setActionErrorMessage] = useState('')

  const agenciesQuery = useAgenciesQuery({
    page: 1,
    pageSize: 500,
    sortBy: 'name',
    sortOrder: 'asc',
  })
  const groupsQuery = useGroupsQuery(
    {
      page,
      pageSize,
      search: normalizeSearchValue(appliedFilters.search) || undefined,
      agencyId: appliedFilters.selectedAgencyId || undefined,
      country: appliedFilters.selectedCountry || undefined,
      city: appliedFilters.selectedCity || undefined,
      status: appliedFilters.groupStatus || undefined,
      paymentStatus: appliedFilters.paymentStatus || undefined,
      minPassengers: appliedFilters.minPassengers ? Number(appliedFilters.minPassengers) : undefined,
      maxPassengers: appliedFilters.maxPassengers ? Number(appliedFilters.maxPassengers) : undefined,
      minAmount: appliedFilters.minAmount ? Number(appliedFilters.minAmount) : undefined,
      maxAmount: appliedFilters.maxAmount ? Number(appliedFilters.maxAmount) : undefined,
      createdDateFrom: appliedFilters.createdDateFrom || undefined,
      createdDateTo: appliedFilters.createdDateTo || undefined,
      sortBy: appliedFilters.sortBy,
      sortOrder: appliedFilters.sortOrder,
    },
    !agenciesQuery.isError,
  )
  const deleteGroupMutation = useDeleteGroupMutation()
  const updateGroupMutation = useUpdateGroupMutation()

  const agencies = agenciesQuery.data?.data ?? []
  const groups = groupsQuery.data?.data ?? []
  const groupsMeta = groupsQuery.data?.meta

  const countryOptions = useMemo(() => {
    return Array.from(new Set(agencies.map((agency) => normalizeAgencyField(agency.country)))).sort(
      (left, right) => left.localeCompare(right),
    )
  }, [agencies])

  const cityOptions = useMemo(() => {
    return Array.from(
      new Set(
        agencies
          .filter((agency) =>
            pendingFilters.selectedCountry
              ? normalizeAgencyField(agency.country) === pendingFilters.selectedCountry
              : true,
          )
          .map((agency) => normalizeAgencyField(agency.city)),
      ),
    ).sort((left, right) => left.localeCompare(right))
  }, [agencies, pendingFilters.selectedCountry])

  const filteredAgencies = useMemo(() => {
    return agencies.filter((agency) => {
      const agencyCountry = normalizeAgencyField(agency.country)
      const agencyCity = normalizeAgencyField(agency.city)

      return (
        (!pendingFilters.selectedCountry || agencyCountry === pendingFilters.selectedCountry) &&
        (!pendingFilters.selectedCity || agencyCity === pendingFilters.selectedCity)
      )
    })
  }, [agencies, pendingFilters.selectedCity, pendingFilters.selectedCountry])

  useEffect(() => {
    if (pendingFilters.selectedCountry && !countryOptions.includes(pendingFilters.selectedCountry)) {
      setPendingFilters((current) => ({
        ...current,
        selectedCountry: '',
        selectedCity: '',
        selectedAgencyId: '',
      }))
    }
  }, [countryOptions, pendingFilters.selectedCountry])

  useEffect(() => {
    if (pendingFilters.selectedCity && !cityOptions.includes(pendingFilters.selectedCity)) {
      setPendingFilters((current) => ({
        ...current,
        selectedCity: '',
        selectedAgencyId: '',
      }))
    }
  }, [cityOptions, pendingFilters.selectedCity])

  useEffect(() => {
    if (
      pendingFilters.selectedAgencyId &&
      !filteredAgencies.some((agency) => agency.id === pendingFilters.selectedAgencyId)
    ) {
      setPendingFilters((current) => ({
        ...current,
        selectedAgencyId: '',
      }))
    }
  }, [filteredAgencies, pendingFilters.selectedAgencyId])

  const hasPendingFilterChanges =
    JSON.stringify(pendingFilters) !== JSON.stringify(appliedFilters)
  const appliedFilterSummary = [
    appliedFilters.search.trim() ? `Search: ${appliedFilters.search.trim()}` : null,
    appliedFilters.selectedCountry ? `Country: ${appliedFilters.selectedCountry}` : null,
    appliedFilters.selectedCity ? `City: ${appliedFilters.selectedCity}` : null,
    appliedFilters.selectedAgencyId
      ? `Agency: ${
          agencies.find((agency) => agency.id === appliedFilters.selectedAgencyId)?.name ?? 'Selected'
        }`
      : null,
    appliedFilters.groupStatus ? `Lifecycle: ${appliedFilters.groupStatus.replace(/_/g, ' ')}` : null,
    appliedFilters.paymentStatus
      ? `Payment: ${appliedFilters.paymentStatus.replace(/_/g, ' ')}`
      : null,
  ]
    .filter(Boolean)
    .join(' · ')

  function applyFilters() {
    setAppliedFilters(pendingFilters)
    setPage(1)
  }

  function resetFilters() {
    setPendingFilters(defaultGroupFilters)
    setAppliedFilters(defaultGroupFilters)
    setPage(1)
  }

  const summary = useMemo(() => {
    return groups.reduce(
      (bucket, group) => {
        bucket.passengers += group.travelerCount
        bucket.totalAmount += Number(group.totalAmount ?? 0)
        bucket.outstandingBalance += Number(group.outstandingBalance ?? 0)
        return bucket
      },
      {
        passengers: 0,
        totalAmount: 0,
        outstandingBalance: 0,
      },
    )
  }, [groups])

  const showingFrom = groupsMeta
    ? groupsMeta.total === 0
      ? 0
      : (groupsMeta.page - 1) * groupsMeta.pageSize + 1
    : 0
  const showingTo = groupsMeta ? Math.min(groupsMeta.page * groupsMeta.pageSize, groupsMeta.total) : 0

  if (agenciesQuery.isPending && !agenciesQuery.data) {
    return <LoadingBlock label="Loading the professional group list..." />
  }

  if (agenciesQuery.isError) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Group list could not be loaded"
        description="The agency directory required for the professional Group list is currently unavailable."
      />
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Group List"
        title="Groups"
        description="Manage existing groups with clearer filters, compact summaries, and dedicated list actions separate from group entry."
        action={
          <Link className="app-button-primary" to="/groups/add">
            New Group
          </Link>
        }
      />

      {actionMessage ? (
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          {actionMessage}
        </div>
      ) : null}

      {actionErrorMessage ? (
        <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {actionErrorMessage}
        </div>
      ) : null}

      <Panel
        title="Filters"
        description="Stage the search, location, lifecycle, financial, and date filters first, then apply them together."
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            applyFilters()
          }}
        >
        <div className="grid gap-4 xl:grid-cols-12">
          <SearchInput
            className="xl:col-span-4"
            placeholder="Search by Group Number, Group Name, Agency, Country, or City"
            value={pendingFilters.search}
            onChange={(value) =>
              setPendingFilters((current) => ({
                ...current,
                search: value,
              }))
            }
          />

          <select
            className="app-field xl:col-span-2"
            value={pendingFilters.selectedCountry}
            onChange={(event) =>
              setPendingFilters((current) => ({
                ...current,
                selectedCountry: event.target.value,
                selectedCity: '',
                selectedAgencyId: '',
              }))
            }
          >
            <option value="">All countries</option>
            {countryOptions.map((country) => (
              <option key={country} value={country}>
                {country}
              </option>
            ))}
          </select>

          <select
            className="app-field disabled:cursor-not-allowed disabled:opacity-60 xl:col-span-2"
            value={pendingFilters.selectedCity}
            disabled={!pendingFilters.selectedCountry}
            onChange={(event) =>
              setPendingFilters((current) => ({
                ...current,
                selectedCity: event.target.value,
                selectedAgencyId: '',
              }))
            }
          >
            <option value="">All cities</option>
            {cityOptions.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>

          <select
            className="app-field xl:col-span-2"
            value={pendingFilters.selectedAgencyId}
            onChange={(event) =>
              setPendingFilters((current) => ({
                ...current,
                selectedAgencyId: event.target.value,
              }))
            }
          >
            <option value="">All agencies</option>
            {filteredAgencies.map((agency) => (
              <option key={agency.id} value={agency.id}>
                {agency.name}
              </option>
            ))}
          </select>

          <select
            className="app-field xl:col-span-2"
            value={pendingFilters.groupStatus}
            onChange={(event) =>
              setPendingFilters((current) => ({
                ...current,
                groupStatus: event.target.value as GroupFilterState['groupStatus'],
              }))
            }
          >
            <option value="">All lifecycle statuses</option>
            <option value="PLANNED">Planned</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Archived</option>
          </select>

          <select
            className="app-field xl:col-span-2"
            value={pendingFilters.paymentStatus}
            onChange={(event) =>
              setPendingFilters((current) => ({
                ...current,
                paymentStatus: event.target.value as GroupFilterState['paymentStatus'],
              }))
            }
          >
            <option value="">All payment statuses</option>
            <option value="UNPAID">Unpaid</option>
            <option value="PARTIALLY_PAID">Partially Paid</option>
            <option value="FULLY_PAID">Fully Paid</option>
          </select>

          <input
            className="rounded-2xl border border-white/10 bg-[rgba(7,15,27,0.55)] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/50 xl:col-span-2"
            min={1}
            placeholder="Min passengers"
            type="number"
            value={pendingFilters.minPassengers}
            onChange={(event) =>
              setPendingFilters((current) => ({
                ...current,
                minPassengers: event.target.value,
              }))
            }
          />

          <input
            className="rounded-2xl border border-white/10 bg-[rgba(7,15,27,0.55)] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/50 xl:col-span-2"
            min={1}
            placeholder="Max passengers"
            type="number"
            value={pendingFilters.maxPassengers}
            onChange={(event) =>
              setPendingFilters((current) => ({
                ...current,
                maxPassengers: event.target.value,
              }))
            }
          />

          <input
            className="rounded-2xl border border-white/10 bg-[rgba(7,15,27,0.55)] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/50 xl:col-span-2"
            min={0}
            placeholder="Min amount"
            step="0.01"
            type="number"
            value={pendingFilters.minAmount}
            onChange={(event) =>
              setPendingFilters((current) => ({
                ...current,
                minAmount: event.target.value,
              }))
            }
          />

          <input
            className="rounded-2xl border border-white/10 bg-[rgba(7,15,27,0.55)] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/50 xl:col-span-2"
            min={0}
            placeholder="Max amount"
            step="0.01"
            type="number"
            value={pendingFilters.maxAmount}
            onChange={(event) =>
              setPendingFilters((current) => ({
                ...current,
                maxAmount: event.target.value,
              }))
            }
          />

          <input
            className="rounded-2xl border border-white/10 bg-[rgba(7,15,27,0.55)] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/50 xl:col-span-2"
            type="date"
            value={pendingFilters.createdDateFrom}
            onChange={(event) =>
              setPendingFilters((current) => ({
                ...current,
                createdDateFrom: event.target.value,
              }))
            }
          />

          <input
            className="rounded-2xl border border-white/10 bg-[rgba(7,15,27,0.55)] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/50 xl:col-span-2"
            type="date"
            value={pendingFilters.createdDateTo}
            onChange={(event) =>
              setPendingFilters((current) => ({
                ...current,
                createdDateTo: event.target.value,
              }))
            }
          />

          <select
            className="rounded-2xl border border-white/10 bg-[rgba(7,15,27,0.55)] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/50 xl:col-span-2"
            value={pendingFilters.sortBy}
            onChange={(event) =>
              setPendingFilters((current) => ({
                ...current,
                sortBy: event.target.value as GroupFilterState['sortBy'],
              }))
            }
          >
            <option value="createdAt">Created Date</option>
            <option value="code">Group Number</option>
            <option value="name">Group Name</option>
            <option value="agencyName">Agency</option>
            <option value="country">Country</option>
            <option value="travelerCount">Passengers</option>
            <option value="amountPerPax">Amount Per Pax</option>
            <option value="totalAmount">Total Amount</option>
            <option value="outstandingBalance">Outstanding Balance</option>
          </select>

          <select
            className="rounded-2xl border border-white/10 bg-[rgba(7,15,27,0.55)] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/50 xl:col-span-2"
            value={pendingFilters.sortOrder}
            onChange={(event) =>
              setPendingFilters((current) => ({
                ...current,
                sortOrder: event.target.value as GroupFilterState['sortOrder'],
              }))
            }
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>

          <div className="xl:col-span-4 flex flex-wrap items-center gap-3">
            <button className="app-button-secondary h-11" type="submit">
              Apply Filters
            </button>
            <button
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
              type="button"
              onClick={resetFilters}
            >
              <FilterX className="h-4 w-4" />
              Reset Filters
            </button>
            <p className="text-sm text-slate-400">
              {appliedFilterSummary || 'No filters applied. Results show the default view.'}
            </p>
          </div>
        </div>
        {hasPendingFilterChanges ? (
          <p className="text-sm text-amber-200">
            Filters changed. Click Apply Filters to update the list and summaries.
          </p>
        ) : null}
        </form>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-4">
        <div className="rounded-[24px] border border-white/10 bg-[rgba(7,15,27,0.45)] px-5 py-5">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            Matching Groups
          </p>
          <p className="mt-3 text-2xl font-semibold text-white">
            {formatNumber(groupsMeta?.total ?? 0)}
          </p>
        </div>
        <div className="rounded-[24px] border border-white/10 bg-[rgba(7,15,27,0.45)] px-5 py-5">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            Visible Passengers
          </p>
          <p className="mt-3 text-2xl font-semibold text-white">{formatNumber(summary.passengers)}</p>
        </div>
        <div className="rounded-[24px] border border-white/10 bg-[rgba(7,15,27,0.45)] px-5 py-5">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            Visible Total Amount
          </p>
          <p className="mt-3 text-2xl font-semibold text-white">
            {formatCurrency(summary.totalAmount)}
          </p>
        </div>
        <div className="rounded-[24px] border border-white/10 bg-[rgba(7,15,27,0.45)] px-5 py-5">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            Visible Outstanding
          </p>
          <p className="mt-3 text-2xl font-semibold text-white">
            {formatCurrency(summary.outstandingBalance)}
          </p>
        </div>
      </div>

      <Panel
        title="Group Table"
        description="This page is reserved for existing group management only."
        action={
          <div className="flex items-center gap-3">
            <span className="text-xs uppercase tracking-[0.18em] text-slate-400">
              Showing {formatNumber(showingFrom)}-{formatNumber(showingTo)} of{' '}
              {formatNumber(groupsMeta?.total ?? 0)} Groups
            </span>
            <select
              className="rounded-2xl border border-white/10 bg-[rgba(7,15,27,0.55)] px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-300/50"
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value) as (typeof pageSizeOptions)[number])
                setPage(1)
              }}
            >
              {pageSizeOptions.map((option) => (
                <option key={option} value={option}>
                  {option} / page
                </option>
              ))}
            </select>
          </div>
        }
      >
        {groupsQuery.isPending && !groupsQuery.data ? (
          <LoadingBlock label="Loading the professional group register..." />
        ) : groupsQuery.isError ? (
          <EmptyState
            icon={ShieldAlert}
            title="Groups could not be loaded"
            description="The professional Group list could not retrieve the latest records from the backend."
          />
        ) : groups.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No Groups Found"
            description="Try widening the search or clearing one or more filters to bring matching groups back into view."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1320px] border-separate border-spacing-y-3">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  <th className="sticky top-0 bg-slate-950/95 px-4 py-3 backdrop-blur">Group Number</th>
                  <th className="sticky top-0 bg-slate-950/95 px-4 py-3 backdrop-blur">Group Name</th>
                  <th className="sticky top-0 bg-slate-950/95 px-4 py-3 backdrop-blur">Agency</th>
                  <th className="sticky top-0 bg-slate-950/95 px-4 py-3 backdrop-blur">Country / City</th>
                  <th className="sticky top-0 bg-slate-950/95 px-4 py-3 backdrop-blur">Lifecycle</th>
                  <th className="sticky top-0 bg-slate-950/95 px-4 py-3 text-right backdrop-blur">Passengers</th>
                  <th className="sticky top-0 bg-slate-950/95 px-4 py-3 text-right backdrop-blur">Amount / Pax</th>
                  <th className="sticky top-0 bg-slate-950/95 px-4 py-3 text-right backdrop-blur">Total Amount</th>
                  <th className="sticky top-0 bg-slate-950/95 px-4 py-3 text-right backdrop-blur">Outstanding</th>
                  <th className="sticky top-0 bg-slate-950/95 px-4 py-3 backdrop-blur">Payment Status</th>
                  <th className="sticky top-0 bg-slate-950/95 px-4 py-3 backdrop-blur">Created</th>
                  <th className="sticky top-0 bg-slate-950/95 px-4 py-3 text-right backdrop-blur">Actions</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((group) => (
                  <tr
                    key={group.id}
                    className="text-sm text-slate-100 transition hover:translate-y-[-1px] hover:text-white"
                  >
                    <td className="rounded-l-[20px] border-y border-l border-white/10 bg-white/[0.04] px-4 py-4 font-semibold">
                      {group.code}
                    </td>
                    <td className="border-y border-white/10 bg-white/[0.04] px-4 py-4">{group.name}</td>
                    <td className="border-y border-white/10 bg-white/[0.04] px-4 py-4">
                      <div>
                        <p className="font-medium text-white">{group.agency?.name ?? 'Unknown agency'}</p>
                        <p className="mt-1 text-xs text-slate-400">{group.agency?.code ?? 'No code'}</p>
                      </div>
                    </td>
                    <td className="border-y border-white/10 bg-white/[0.04] px-4 py-4 text-slate-300">
                      {normalizeAgencyField(group.agency?.country) +
                        ' / ' +
                        normalizeAgencyField(group.agency?.city)}
                    </td>
                    <td className="border-y border-white/10 bg-white/[0.04] px-4 py-4">
                      <StatusBadge
                        label={group.status.replace(/_/g, ' ')}
                        tone={getLifecycleTone(group.status)}
                      />
                    </td>
                    <td className="border-y border-white/10 bg-white/[0.04] px-4 py-4 text-right">
                      {formatNumber(group.travelerCount)}
                    </td>
                    <td className="border-y border-white/10 bg-white/[0.04] px-4 py-4 text-right">
                      {group.amountPerPax ? formatCurrency(Number(group.amountPerPax)) : '-'}
                    </td>
                    <td className="border-y border-white/10 bg-white/[0.04] px-4 py-4 text-right font-semibold text-white">
                      {group.totalAmount ? formatCurrency(Number(group.totalAmount)) : '-'}
                    </td>
                    <td className="border-y border-white/10 bg-white/[0.04] px-4 py-4 text-right">
                      {formatCurrency(Number(group.outstandingBalance ?? 0))}
                    </td>
                    <td className="border-y border-white/10 bg-white/[0.04] px-4 py-4">
                      <StatusBadge
                        label={group.paymentStatusLabel ?? 'Unknown'}
                        tone={getFinancialTone(group.paymentStatus)}
                      />
                    </td>
                    <td className="border-y border-white/10 bg-white/[0.04] px-4 py-4">
                      {formatDate(group.createdAt)}
                    </td>
                    <td className="rounded-r-[20px] border-y border-r border-white/10 bg-white/[0.04] px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          className="inline-flex items-center gap-2 rounded-2xl border border-cyan-400/25 bg-cyan-500/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100 transition hover:bg-cyan-500/20"
                          to={`/groups/${group.id}`}
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </Link>
                        <Link
                          className="inline-flex items-center gap-2 rounded-2xl border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-amber-100 transition hover:bg-amber-500/20"
                          to={`/groups/${group.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                          Edit
                        </Link>
                        <button
                          className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                          type="button"
                          disabled={updateGroupMutation.isPending || group.status === 'CANCELLED'}
                          onClick={() => {
                            const confirmed = window.confirm(
                              `Archive group ${group.code}? This uses the existing Cancelled status and keeps all records intact.`,
                            )

                            if (!confirmed) {
                              return
                            }

                            setActionMessage('')
                            setActionErrorMessage('')
                            updateGroupMutation.mutate(
                              {
                                id: group.id,
                                payload: {
                                  status: 'CANCELLED',
                                },
                              },
                              {
                                onSuccess: () => {
                                  setActionMessage('Group archived successfully.')
                                },
                                onError: (error) => {
                                  setActionErrorMessage(getApiErrorMessage(error))
                                },
                              },
                            )
                          }}
                        >
                          <Archive className="h-4 w-4" />
                          {group.status === 'CANCELLED' ? 'Archived' : 'Archive'}
                        </button>
                        <button
                          className="inline-flex items-center gap-2 rounded-2xl border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-rose-100 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                          type="button"
                          disabled={deleteGroupMutation.isPending}
                          onClick={() => {
                            const confirmed = window.confirm(
                              `This action cannot be undone.\n\nDelete group ${group.code}?`,
                            )

                            if (!confirmed) {
                              return
                            }

                            setActionMessage('')
                            setActionErrorMessage('')
                            deleteGroupMutation.mutate(group.id, {
                              onSuccess: () => {
                                setActionMessage('Group deleted successfully.')
                              },
                              onError: (error) => {
                                setActionErrorMessage(getApiErrorMessage(error))
                              },
                            })
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {groupsMeta ? (
          <div className="mt-5">
            <PaginationControls
              page={groupsMeta.page}
              totalPages={groupsMeta.totalPages}
              total={groupsMeta.total}
              onPrevious={() => setPage((current) => Math.max(1, current - 1))}
              onNext={() => setPage((current) => Math.min(groupsMeta.totalPages, current + 1))}
            />
          </div>
        ) : null}
      </Panel>
    </div>
  )
}
