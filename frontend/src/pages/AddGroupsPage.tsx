import { useEffect, useMemo, useState } from 'react'
import { Building2, Plus, Save, ShieldAlert, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAgenciesQuery } from '@/features/agencies/api'
import { useBulkCreateGroupsMutation } from '@/features/groups/api'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingBlock } from '@/components/ui/LoadingBlock'
import { Panel } from '@/components/ui/Panel'
import { getApiErrorMessage } from '@/lib/api-client'
import { formatCurrency, formatNumber } from '@/lib/format'

type EntryRow = {
  id: string
  groupNumber: string
  groupName: string
  pax: string
  amountPerPax: string
}

type EntryRowIssue = {
  groupNumber?: string
  pax?: string
  amountPerPax?: string
}

type SaveSummary = {
  count: number
  totalPax: number
  grandTotalAmount: number
}

function createEmptyEntryRow(): EntryRow {
  return {
    id: crypto.randomUUID(),
    groupNumber: '',
    groupName: '',
    pax: '',
    amountPerPax: '',
  }
}

function normalizeAgencyField(value: string | null | undefined) {
  return value?.trim() || 'Unspecified'
}

function normalizeGroupNumber(value: string) {
  return value.trim()
}

function parsePositiveNumber(value: string) {
  if (!value.trim()) {
    return 0
  }

  const parsedValue = Number(value)
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 0
}

function getRowTotalAmount(row: EntryRow) {
  return parsePositiveNumber(row.pax) * parsePositiveNumber(row.amountPerPax)
}

function isRowEmpty(row: EntryRow) {
  return (
    !row.groupNumber.trim() &&
    !row.groupName.trim() &&
    !row.pax.trim() &&
    !row.amountPerPax.trim()
  )
}

function isNumericGroupNumber(value: string) {
  return /^\d+$/.test(value)
}

function getDuplicateGroupNumbersFromMessage(message: string) {
  if (!/already exists/i.test(message)) {
    return []
  }

  return Array.from(new Set(message.match(/\b\d+\b/g) ?? []))
}

export function AddGroupsPage() {
  const [selectedCountry, setSelectedCountry] = useState('')
  const [selectedCity, setSelectedCity] = useState('')
  const [selectedAgencyId, setSelectedAgencyId] = useState('')
  const [entryRows, setEntryRows] = useState<EntryRow[]>([createEmptyEntryRow()])
  const [saveSummary, setSaveSummary] = useState<SaveSummary | null>(null)
  const [saveErrorMessage, setSaveErrorMessage] = useState('')
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [serverRowIssues, setServerRowIssues] = useState<Record<string, string>>({})

  const agenciesQuery = useAgenciesQuery({
    page: 1,
    pageSize: 500,
    sortBy: 'name',
    sortOrder: 'asc',
  })
  const bulkCreateGroupsMutation = useBulkCreateGroupsMutation()
  const agencies = agenciesQuery.data?.data ?? []

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
            selectedCountry ? normalizeAgencyField(agency.country) === selectedCountry : true,
          )
          .map((agency) => normalizeAgencyField(agency.city)),
      ),
    ).sort((left, right) => left.localeCompare(right))
  }, [agencies, selectedCountry])

  const filteredAgencies = useMemo(() => {
    return agencies.filter((agency) => {
      const agencyCountry = normalizeAgencyField(agency.country)
      const agencyCity = normalizeAgencyField(agency.city)

      return (
        (!selectedCountry || agencyCountry === selectedCountry) &&
        (!selectedCity || agencyCity === selectedCity)
      )
    })
  }, [agencies, selectedCity, selectedCountry])

  useEffect(() => {
    if (selectedCountry && !countryOptions.includes(selectedCountry)) {
      setSelectedCountry('')
    }
  }, [countryOptions, selectedCountry])

  useEffect(() => {
    if (selectedCity && !cityOptions.includes(selectedCity)) {
      setSelectedCity('')
    }
  }, [cityOptions, selectedCity])

  useEffect(() => {
    if (selectedAgencyId && !filteredAgencies.some((agency) => agency.id === selectedAgencyId)) {
      setSelectedAgencyId('')
      return
    }

    if (!selectedAgencyId && filteredAgencies.length === 1) {
      setSelectedAgencyId(filteredAgencies[0]?.id ?? '')
    }
  }, [filteredAgencies, selectedAgencyId])

  const activeRows = useMemo(() => {
    return entryRows.filter((row) => !isRowEmpty(row))
  }, [entryRows])

  const rowIssues = useMemo(() => {
    const duplicateRowMap = new Map<string, number[]>()

    activeRows.forEach((row, index) => {
      const normalizedGroupNumber = normalizeGroupNumber(row.groupNumber)
      if (!normalizedGroupNumber) {
        return
      }

      const bucket = duplicateRowMap.get(normalizedGroupNumber) ?? []
      bucket.push(index)
      duplicateRowMap.set(normalizedGroupNumber, bucket)
    })

    return activeRows.map((row) => {
      const issues: EntryRowIssue = {}
      const normalizedGroupNumber = normalizeGroupNumber(row.groupNumber)

      if (!normalizedGroupNumber) {
        issues.groupNumber = 'Group Number is required.'
      } else if (!isNumericGroupNumber(normalizedGroupNumber)) {
        issues.groupNumber = 'Group Number must contain numbers only.'
      } else if ((duplicateRowMap.get(normalizedGroupNumber)?.length ?? 0) > 1) {
        issues.groupNumber = 'Duplicate Group Number in this batch.'
      }

      if (!issues.groupNumber && serverRowIssues[row.id]) {
        issues.groupNumber = serverRowIssues[row.id]
      }

      if (parsePositiveNumber(row.pax) <= 0) {
        issues.pax = 'Passengers must be greater than zero.'
      }

      if (parsePositiveNumber(row.amountPerPax) <= 0) {
        issues.amountPerPax = 'Amount Per Pax must be greater than zero.'
      }

      return issues
    })
  }, [activeRows, serverRowIssues])

  const hasValidationErrors = rowIssues.some(
    (issues) => issues.groupNumber || issues.pax || issues.amountPerPax,
  )

  const summary = useMemo(() => {
    return activeRows.reduce(
      (bucket, row) => {
        bucket.totalGroups += 1
        bucket.totalPax += parsePositiveNumber(row.pax)
        bucket.grandTotalAmount += getRowTotalAmount(row)
        return bucket
      },
      {
        totalGroups: 0,
        totalPax: 0,
        grandTotalAmount: 0,
      },
    )
  }, [activeRows])

  const selectedAgency =
    filteredAgencies.find((agency) => agency.id === selectedAgencyId) ??
    agencies.find((agency) => agency.id === selectedAgencyId) ??
    null

  if (agenciesQuery.isPending && !agenciesQuery.data) {
    return <LoadingBlock label="Loading the Add Groups workspace..." />
  }

  if (agenciesQuery.isError) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Add Groups could not be loaded"
        description="The agency directory required for bulk group entry is currently unavailable."
      />
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Add Groups"
        title="Create new groups in one focused data-entry workspace"
        description="This page is dedicated to adding new groups only, keeping batch entry clean and separate from list management."
        action={
          <Link
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
            to="/groups"
          >
            Go to Group List
          </Link>
        }
      />

      <Panel
        title="Bulk Group Entry"
        description="Choose a Country, City, and Agency, then add multiple groups in one save. Existing groups are intentionally hidden from this page."
        action={
          <button
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
            type="button"
            onClick={() => {
              setEntryRows((current) => [...current, createEmptyEntryRow()])
              setSaveSummary(null)
              setSaveErrorMessage('')
            }}
          >
            <Plus className="h-4 w-4" />
            Add Another Group
          </button>
        }
      >
        <div className="grid gap-4 md:grid-cols-3">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              Country
            </span>
            <select
              className="w-full rounded-2xl border border-white/10 bg-[rgba(7,15,27,0.55)] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/50"
              value={selectedCountry}
              onChange={(event) => {
                setSelectedCountry(event.target.value)
                setSelectedCity('')
                setSelectedAgencyId('')
              }}
            >
              <option value="">Select Country</option>
              {countryOptions.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              City
            </span>
            <select
              className="w-full rounded-2xl border border-white/10 bg-[rgba(7,15,27,0.55)] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/50 disabled:cursor-not-allowed disabled:opacity-60"
              value={selectedCity}
              disabled={!selectedCountry}
              onChange={(event) => {
                setSelectedCity(event.target.value)
                setSelectedAgencyId('')
              }}
            >
              <option value="">Select City</option>
              {cityOptions.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              Travel Agency
            </span>
            <select
              className="w-full rounded-2xl border border-white/10 bg-[rgba(7,15,27,0.55)] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/50 disabled:cursor-not-allowed disabled:opacity-60"
              value={selectedAgencyId}
              disabled={!selectedCity && filteredAgencies.length !== 1}
              onChange={(event) => {
                setSelectedAgencyId(event.target.value)
              }}
            >
              <option value="">Select Travel Agency</option>
              {filteredAgencies.map((agency) => (
                <option key={agency.id} value={agency.id}>
                  {agency.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        {!selectedAgencyId ? (
          <div className="mt-6">
            <EmptyState
              icon={Building2}
              title="Select an agency to begin"
              description="This page is for creating new groups only, so it waits for a specific agency before showing the entry grid."
            />
          </div>
        ) : (
          <>
            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-3">
                <thead>
                  <tr className="text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    <th className="px-4 py-2">Group Number</th>
                    <th className="px-4 py-2">Group Name</th>
                    <th className="px-4 py-2 text-right">Passengers</th>
                    <th className="px-4 py-2 text-right">Amount Per Pax</th>
                    <th className="px-4 py-2 text-right">Total Amount</th>
                    <th className="px-4 py-2 text-right">Delete Row</th>
                  </tr>
                </thead>
                <tbody>
                  {entryRows.map((row) => {
                    const activeRowIndex = activeRows.findIndex((activeRow) => activeRow.id === row.id)
                    const issues = activeRowIndex >= 0 ? rowIssues[activeRowIndex] ?? {} : {}
                    const showIssues =
                      submitAttempted && (issues.groupNumber || issues.pax || issues.amountPerPax)

                    return (
                      <tr key={row.id} className="align-top text-sm text-slate-100">
                        <td className="rounded-l-[20px] border-y border-l border-white/10 bg-white/[0.04] px-4 py-4">
                          <input
                            className={`w-full rounded-2xl border px-3 py-2 text-sm text-white outline-none transition ${
                              showIssues && issues.groupNumber
                                ? 'border-rose-400/60 bg-rose-500/10'
                                : 'border-white/10 bg-[rgba(7,15,27,0.55)] focus:border-cyan-300/50'
                            }`}
                            inputMode="numeric"
                            pattern="[0-9]*"
                            placeholder="Required"
                            value={row.groupNumber}
                            onChange={(event) => {
                              const nextValue = event.target.value
                              setEntryRows((current) =>
                                current.map((entry) =>
                                  entry.id === row.id ? { ...entry, groupNumber: nextValue } : entry,
                                ),
                              )
                              setServerRowIssues((current) => {
                                if (!current[row.id]) {
                                  return current
                                }

                                const nextIssues = { ...current }
                                delete nextIssues[row.id]
                                return nextIssues
                              })
                              setSaveSummary(null)
                              setSaveErrorMessage('')
                            }}
                          />
                          {showIssues && issues.groupNumber ? (
                            <p className="mt-2 text-xs text-rose-200">{issues.groupNumber}</p>
                          ) : null}
                        </td>
                        <td className="border-y border-white/10 bg-white/[0.04] px-4 py-4">
                          <input
                            className="w-full rounded-2xl border border-white/10 bg-[rgba(7,15,27,0.55)] px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-300/50"
                            placeholder="Optional"
                            value={row.groupName}
                            onChange={(event) => {
                              setEntryRows((current) =>
                                current.map((entry) =>
                                  entry.id === row.id ? { ...entry, groupName: event.target.value } : entry,
                                ),
                              )
                              setSaveSummary(null)
                              setSaveErrorMessage('')
                            }}
                          />
                        </td>
                        <td className="border-y border-white/10 bg-white/[0.04] px-4 py-4">
                          <input
                            className={`w-full rounded-2xl border px-3 py-2 text-right text-sm text-white outline-none transition ${
                              showIssues && issues.pax
                                ? 'border-rose-400/60 bg-rose-500/10'
                                : 'border-white/10 bg-[rgba(7,15,27,0.55)] focus:border-cyan-300/50'
                            }`}
                            min={1}
                            placeholder="0"
                            type="number"
                            value={row.pax}
                            onChange={(event) => {
                              setEntryRows((current) =>
                                current.map((entry) =>
                                  entry.id === row.id ? { ...entry, pax: event.target.value } : entry,
                                ),
                              )
                              setSaveSummary(null)
                              setSaveErrorMessage('')
                            }}
                          />
                          {showIssues && issues.pax ? (
                            <p className="mt-2 text-xs text-right text-rose-200">{issues.pax}</p>
                          ) : null}
                        </td>
                        <td className="border-y border-white/10 bg-white/[0.04] px-4 py-4">
                          <input
                            className={`w-full rounded-2xl border px-3 py-2 text-right text-sm text-white outline-none transition ${
                              showIssues && issues.amountPerPax
                                ? 'border-rose-400/60 bg-rose-500/10'
                                : 'border-white/10 bg-[rgba(7,15,27,0.55)] focus:border-cyan-300/50'
                            }`}
                            min={0}
                            step="0.01"
                            placeholder="0.00"
                            type="number"
                            value={row.amountPerPax}
                            onChange={(event) => {
                              setEntryRows((current) =>
                                current.map((entry) =>
                                  entry.id === row.id
                                    ? { ...entry, amountPerPax: event.target.value }
                                    : entry,
                                ),
                              )
                              setSaveSummary(null)
                              setSaveErrorMessage('')
                            }}
                          />
                          {showIssues && issues.amountPerPax ? (
                            <p className="mt-2 text-xs text-right text-rose-200">
                              {issues.amountPerPax}
                            </p>
                          ) : null}
                        </td>
                        <td className="border-y border-white/10 bg-white/[0.04] px-4 py-4 text-right font-semibold text-white">
                          {formatCurrency(getRowTotalAmount(row))}
                        </td>
                        <td className="rounded-r-[20px] border-y border-r border-white/10 bg-white/[0.04] px-4 py-4 text-right">
                          <button
                            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                            type="button"
                            disabled={entryRows.length === 1}
                            onClick={() => {
                              setEntryRows((current) =>
                                current.length === 1
                                  ? current
                                  : current.filter((entry) => entry.id !== row.id),
                              )
                              setServerRowIssues((current) => {
                                if (!current[row.id]) {
                                  return current
                                }

                                const nextIssues = { ...current }
                                delete nextIssues[row.id]
                                return nextIssues
                              })
                              setSaveSummary(null)
                              setSaveErrorMessage('')
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-[22px] border border-white/10 bg-[rgba(7,15,27,0.45)] px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Total Groups
                </p>
                <p className="mt-3 text-lg font-semibold text-white">
                  {formatNumber(summary.totalGroups)}
                </p>
              </div>
              <div className="rounded-[22px] border border-white/10 bg-[rgba(7,15,27,0.45)] px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Total Passengers
                </p>
                <p className="mt-3 text-lg font-semibold text-white">
                  {formatNumber(summary.totalPax)}
                </p>
              </div>
              <div className="rounded-[22px] border border-white/10 bg-[rgba(7,15,27,0.45)] px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Grand Total Amount
                </p>
                <p className="mt-3 text-lg font-semibold text-white">
                  {formatCurrency(summary.grandTotalAmount)}
                </p>
              </div>
            </div>

            {saveSummary ? (
              <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                <p className="font-semibold text-emerald-50">Groups saved successfully.</p>
                <p className="mt-2">{formatNumber(saveSummary.count)} Groups saved successfully.</p>
                <p>Total Pax: {formatNumber(saveSummary.totalPax)}</p>
                <p>Grand Total: {formatCurrency(saveSummary.grandTotalAmount)}</p>
              </div>
            ) : null}

            {saveErrorMessage ? (
              <div className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                {saveErrorMessage}
              </div>
            ) : null}

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300"
                type="button"
                disabled={!selectedAgencyId || bulkCreateGroupsMutation.isPending || activeRows.length === 0}
                onClick={() => {
                  if (bulkCreateGroupsMutation.isPending) {
                    return
                  }

                  setSubmitAttempted(true)
                  setSaveErrorMessage('')
                  setServerRowIssues({})

                  if (activeRows.length === 0 || hasValidationErrors) {
                    return
                  }

                  const pendingSummary = activeRows.reduce(
                    (bucket, row) => {
                      bucket.count += 1
                      bucket.totalPax += Number(row.pax)
                      bucket.grandTotalAmount += getRowTotalAmount(row)
                      return bucket
                    },
                    {
                      count: 0,
                      totalPax: 0,
                      grandTotalAmount: 0,
                    },
                  )

                  bulkCreateGroupsMutation.mutate(
                    {
                      agencyId: selectedAgencyId,
                      rows: activeRows.map((row) => ({
                        groupNumber: normalizeGroupNumber(row.groupNumber),
                        groupName: row.groupName.trim() || undefined,
                        pax: Number(row.pax),
                        amountPerPax: Number(row.amountPerPax),
                      })),
                    },
                    {
                      onSuccess: () => {
                        setEntryRows([createEmptyEntryRow()])
                        setSubmitAttempted(false)
                        setServerRowIssues({})
                        setSaveErrorMessage('')
                        setSaveSummary(pendingSummary)
                      },
                      onError: (error) => {
                        const message = getApiErrorMessage(error)
                        const duplicateGroupNumbers = getDuplicateGroupNumbersFromMessage(message)

                        if (duplicateGroupNumbers.length > 0) {
                          const nextIssues = activeRows.reduce<Record<string, string>>((bucket, row) => {
                            if (duplicateGroupNumbers.includes(normalizeGroupNumber(row.groupNumber))) {
                              bucket[row.id] = 'This Group Number already exists in the database.'
                            }

                            return bucket
                          }, {})

                          setServerRowIssues(nextIssues)
                        }

                        setSaveSummary(null)
                        setSaveErrorMessage(message)
                      },
                    },
                  )
                }}
              >
                <Save className="h-4 w-4" />
                {bulkCreateGroupsMutation.isPending ? 'Saving...' : 'Save All Groups'}
              </button>

              <button
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
                type="button"
                onClick={() => {
                  setEntryRows([createEmptyEntryRow()])
                  setSubmitAttempted(false)
                  setSaveSummary(null)
                  setSaveErrorMessage('')
                  setServerRowIssues({})
                }}
              >
                Reset Grid
              </button>

              {selectedAgency ? (
                <p className="text-sm text-slate-400">
                  Saving into <span className="font-semibold text-slate-200">{selectedAgency.name}</span>
                </p>
              ) : null}
            </div>
          </>
        )}
      </Panel>
    </div>
  )
}
