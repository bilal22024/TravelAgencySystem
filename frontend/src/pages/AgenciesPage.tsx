import { useMemo, useState } from 'react'
import { Building2, GitBranch, ShieldAlert, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  useAgencyDetailsQuery,
  useAgenciesQuery,
  useCreateAgencyMutation,
  useDeleteAgencyMutation,
  useUpdateAgencyMutation,
} from '@/features/agencies/api'
import { AgencyForm } from '@/features/agencies/components/AgencyForm'
import { useAuthStore } from '@/features/auth/store/useAuthStore'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingBlock } from '@/components/ui/LoadingBlock'
import { PaginationControls } from '@/components/ui/PaginationControls'
import { Panel } from '@/components/ui/Panel'
import { SearchInput } from '@/components/ui/SearchInput'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch'

export function AgenciesPage() {
  const [selectedAgencyId, setSelectedAgencyId] = useState<string | null>(null)
  const [isActive, setIsActive] = useState<'true' | 'false' | ''>('')
  const [agencyType, setAgencyType] = useState<'' | 'PARENT' | 'BRANCH'>('')
  const [category, setCategory] = useState('')
  const [sortBy, setSortBy] = useState<
    'name' | 'code' | 'city' | 'country' | 'agencyType' | 'category' | 'createdAt' | 'updatedAt'
  >(
    'createdAt',
  )
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)
  const user = useAuthStore((state) => state.user)
  const { searchText, debouncedSearchText, updateSearchText } = useDebouncedSearch()

  const agencyListParams = useMemo(
    () => ({
      page,
      pageSize: 10,
      search: debouncedSearchText || undefined,
      isActive: isActive || undefined,
      agencyType: agencyType || undefined,
      category: category.trim() || undefined,
      sortBy,
      sortOrder,
    }),
    [agencyType, category, debouncedSearchText, isActive, page, sortBy, sortOrder],
  )

  const agenciesQuery = useAgenciesQuery(agencyListParams)
  const selectedAgencyQuery = useAgencyDetailsQuery(
    selectedAgencyId ?? undefined,
    false,
    Boolean(selectedAgencyId),
  )
  const createAgencyMutation = useCreateAgencyMutation()
  const updateAgencyMutation = useUpdateAgencyMutation()
  const deleteAgencyMutation = useDeleteAgencyMutation()
  const agencies = agenciesQuery.data?.data ?? []
  const meta = agenciesQuery.data?.meta

  const canManageAgencies = user?.role === 'SUPER_ADMIN'
  const selectedAgency = selectedAgencyQuery.data ?? null

  if (agenciesQuery.isPending && !agenciesQuery.data) {
    return <LoadingBlock label="Loading agency roster..." />
  }

  if (agenciesQuery.isError) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Agencies could not be loaded"
        description="The list request failed before the management workspace could be rendered."
      />
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Agency directory"
        title="Manage parent agencies, branches, and finance-ready agency profiles"
        description="Phase 1 introduces hierarchy-aware agency management, richer profile data, better filters, and a dedicated details workflow."
      />

      <div className="grid gap-6 xl:grid-cols-[1.35fr,0.9fr]">
        <Panel
          title="Agencies"
          description="Search and filter parent agencies and branches from the authenticated API scope."
          action={
            canManageAgencies ? (
              <button
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
                type="button"
                onClick={() => setSelectedAgencyId(null)}
              >
                New agency
              </button>
            ) : null
          }
        >
          <div className="grid gap-3 border-b border-white/10 pb-5 md:grid-cols-4">
            <SearchInput
              className="md:col-span-2"
              placeholder="Search by name, country, city, or agent number"
              value={searchText}
              onChange={(value) => {
                updateSearchText(value)
                setPage(1)
              }}
            />
            <select
              className="rounded-2xl border border-white/10 bg-[rgba(7,15,27,0.55)] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/50"
              value={agencyType}
              onChange={(event) => {
                setAgencyType(event.target.value as '' | 'PARENT' | 'BRANCH')
                setPage(1)
              }}
            >
              <option value="">All types</option>
              <option value="PARENT">Parent agencies</option>
              <option value="BRANCH">Branch agencies</option>
            </select>
            <input
              className="rounded-2xl border border-white/10 bg-[rgba(7,15,27,0.55)] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/50"
              placeholder="Category"
              value={category}
              onChange={(event) => {
                setCategory(event.target.value)
                setPage(1)
              }}
            />
            <select
              className="rounded-2xl border border-white/10 bg-[rgba(7,15,27,0.55)] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/50"
              value={isActive}
              onChange={(event) => {
                setIsActive(event.target.value as 'true' | 'false' | '')
                setPage(1)
              }}
            >
              <option value="">All statuses</option>
              <option value="true">Active only</option>
              <option value="false">Inactive only</option>
            </select>
            <div className="grid grid-cols-2 gap-3">
              <select
                className="rounded-2xl border border-white/10 bg-[rgba(7,15,27,0.55)] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/50"
                value={sortBy}
                onChange={(event) => {
                  setSortBy(event.target.value as typeof sortBy)
                  setPage(1)
                }}
              >
                <option value="createdAt">Newest</option>
                <option value="updatedAt">Recently updated</option>
                <option value="name">Name</option>
                <option value="code">Code</option>
                <option value="agencyType">Agency type</option>
                <option value="category">Category</option>
                <option value="city">City</option>
                <option value="country">Country</option>
              </select>
              <select
                className="rounded-2xl border border-white/10 bg-[rgba(7,15,27,0.55)] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/50"
                value={sortOrder}
                onChange={(event) => {
                  setSortOrder(event.target.value as 'asc' | 'desc')
                  setPage(1)
                }}
              >
                <option value="desc">Desc</option>
                <option value="asc">Asc</option>
              </select>
            </div>
          </div>

          <div className="space-y-3 pt-5">
            {agencies.length === 0 ? (
              <EmptyState
                icon={Building2}
                title="No agencies found"
                description="Try widening the search or clearing filters to bring more results back into view."
              />
            ) : (
              agencies.map((agency) => (
                <button
                  key={agency.id}
                  className={`w-full rounded-[24px] border px-4 py-4 text-left transition hover:bg-white/[0.08] ${
                    selectedAgencyId === agency.id
                      ? 'border-cyan-300/40 bg-cyan-400/10'
                      : 'border-white/10 bg-[rgba(7,15,27,0.45)]'
                  }`}
                  type="button"
                  onClick={() => setSelectedAgencyId(agency.id)}
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-white">{agency.name}</p>
                          <span className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                            {agency.agencyType === 'PARENT' ? 'Parent' : 'Branch'}
                          </span>
                          {agency.branchCount > 0 ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-100">
                              <GitBranch className="h-3.5 w-3.5" />
                              {agency.branchCount} branches
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-sm text-slate-300">
                          {agency.code} • {agency.city || 'City not set'} •{' '}
                          {agency.country || 'Country not set'}
                        </p>
                        <p className="mt-2 text-sm text-slate-400">
                          {agency.parentAgency
                            ? `Parent: ${agency.parentAgency.name}`
                            : 'Top-level agency'}
                          {agency.category ? ` • ${agency.category}` : ''}
                        </p>
                      </div>
                      <StatusBadge
                        label={agency.isActive ? 'Active' : 'Inactive'}
                        tone={agency.isActive ? 'success' : 'warning'}
                      />
                    </div>
                    <div>
                      <div className="grid gap-2 text-sm text-slate-300 sm:grid-cols-3">
                        <span>Opening Balance: {agency.openingBalance.toFixed(2)}</span>
                        <span>Primary Contact: {agency.primaryContactPerson || 'Not set'}</span>
                        <span>Main Phone: {agency.contactPhone || 'Not set'}</span>
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

          {meta ? (
            <div className="mt-5">
              <PaginationControls
                page={meta.page}
                totalPages={meta.totalPages}
                total={meta.total}
                onPrevious={() => setPage((current) => Math.max(1, current - 1))}
                onNext={() => setPage((current) => Math.min(meta.totalPages, current + 1))}
              />
            </div>
          ) : null}
        </Panel>

        <Panel
          title={selectedAgency ? 'Edit agency' : 'Create agency'}
          description={
            canManageAgencies
              ? 'Super administrators can create, update, and archive hierarchy-aware agency records from this panel.'
              : 'Only super administrators can change agency records in this phase.'
          }
          action={
            selectedAgency ? (
              <div className="flex flex-wrap gap-3">
                <Link
                  className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
                  to={`/agencies/${selectedAgency.id}`}
                >
                  Open details
                </Link>
                <Link
                  className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
                  to={`/reports/agency?agencyId=${selectedAgency.id}`}
                >
                  Open agency report
                </Link>
              </div>
            ) : null
          }
        >
          {canManageAgencies ? (
            <div className="space-y-4">
              {selectedAgencyId && selectedAgencyQuery.isPending ? (
                <LoadingBlock label="Loading agency details..." />
              ) : (
                <AgencyForm
                  agency={selectedAgency}
                  disabled={
                    createAgencyMutation.isPending ||
                    updateAgencyMutation.isPending ||
                    deleteAgencyMutation.isPending
                  }
                  onSubmit={(payload) => {
                    if (selectedAgency) {
                      updateAgencyMutation.mutate({ id: selectedAgency.id, payload })
                      return
                    }

                    createAgencyMutation.mutate(payload)
                  }}
                />
              )}

              {selectedAgency ? (
                <button
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-100 transition hover:bg-rose-500/20"
                  type="button"
                  onClick={() => {
                    deleteAgencyMutation.mutate(selectedAgency.id, {
                      onSuccess: () => {
                        setSelectedAgencyId(null)
                      },
                    })
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete agency
                </button>
              ) : null}
            </div>
          ) : (
            <EmptyState
              icon={ShieldAlert}
              title="Restricted action"
              description="Your current role can review agency details here, but record creation and editing stay limited to super administrators."
            />
          )}
        </Panel>
      </div>
    </div>
  )
}
