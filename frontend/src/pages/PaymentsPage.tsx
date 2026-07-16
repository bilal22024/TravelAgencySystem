import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { CreditCard, Download, Printer, ShieldAlert, Trash2 } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingBlock } from '@/components/ui/LoadingBlock'
import { PaginationControls } from '@/components/ui/PaginationControls'
import { Panel } from '@/components/ui/Panel'
import { SearchInput } from '@/components/ui/SearchInput'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useAgenciesQuery } from '@/features/agencies/api'
import { useAuthStore } from '@/features/auth/store/useAuthStore'
import { useUsersQuery } from '@/features/dashboard/api'
import {
  downloadPaymentReceiptPdf,
  getPaymentReceipt,
  useCreatePaymentEntryMutation,
  useDeletePaymentMutation,
  usePaymentEntryGroupsQuery,
  usePaymentsQuery,
} from '@/features/payments/api'
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch'
import { formatCurrency, formatDate, formatNumber, formatRelativeStatusDate } from '@/lib/format'
import { getApiErrorMessage } from '@/lib/api-client'
import { queryKeys } from '@/lib/query-keys'
import type { PaymentMethod, PaymentReceipt, PaymentStatus } from '@/types/api'

const paymentStatusOptions: Array<{ value: '' | PaymentStatus; label: string }> = [
  { value: '', label: 'All statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'PARTIALLY_ALLOCATED', label: 'Partially allocated' },
  { value: 'ALLOCATED', label: 'Allocated' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'REFUNDED', label: 'Refunded' },
]

const paymentMethodOptions: Array<{ value: PaymentMethod; label: string }> = [
  { value: 'CASH', label: 'Cash' },
  { value: 'BANK_TRANSFER', label: 'Bank' },
  { value: 'ONLINE', label: 'Online' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'CREDIT_CARD', label: 'Credit card' },
  { value: 'DEBIT_CARD', label: 'Debit card' },
  { value: 'OTHER', label: 'Other' },
]

function getTodayInputValue() {
  return new Date().toISOString().slice(0, 10)
}

function normalizeAgencyLocation(value: string | null) {
  return value?.trim() || 'Unspecified'
}

function formatPaymentMethodLabel(method: PaymentMethod) {
  return paymentMethodOptions.find((option) => option.value === method)?.label ?? method
}

function getPaymentTone(status: PaymentStatus) {
  switch (status) {
    case 'ALLOCATED':
      return 'success' as const
    case 'FAILED':
    case 'REFUNDED':
      return 'danger' as const
    case 'PARTIALLY_ALLOCATED':
      return 'info' as const
    default:
      return 'warning' as const
  }
}

function getSettlementTone(status: 'UNPAID' | 'PARTIALLY_PAID' | 'FULLY_PAID') {
  switch (status) {
    case 'FULLY_PAID':
      return 'success' as const
    case 'PARTIALLY_PAID':
      return 'warning' as const
    default:
      return 'danger' as const
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function buildReceiptPrintDocument(receipt: PaymentReceipt) {
  const rows = receipt.groups
    .map(
      (group) => `
        <tr>
          <td>${escapeHtml(group.groupNumber)}</td>
          <td>${escapeHtml(group.groupName || 'Unnamed Group')}</td>
          <td style="text-align:right;">${group.passengers}</td>
          <td style="text-align:right;">${escapeHtml(formatCurrency(group.groupTotalAmount))}</td>
          <td style="text-align:right;">${escapeHtml(formatCurrency(group.allocatedAmount))}</td>
        </tr>`,
    )
    .join('')

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(receipt.receiptNumber)}</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 32px; color: #0f172a; }
      h1, h2, p { margin: 0; }
      .header { display: flex; justify-content: space-between; gap: 24px; margin-bottom: 28px; }
      .block { border: 1px solid #cbd5e1; border-radius: 14px; padding: 16px; margin-bottom: 18px; }
      .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px 20px; }
      .label { color: #475569; font-size: 12px; text-transform: uppercase; letter-spacing: 0.12em; margin-bottom: 6px; }
      .value { font-size: 15px; font-weight: 600; }
      table { width: 100%; border-collapse: collapse; margin-top: 12px; }
      th, td { border-bottom: 1px solid #e2e8f0; padding: 10px 8px; font-size: 14px; text-align: left; }
      th { color: #475569; text-transform: uppercase; letter-spacing: 0.1em; font-size: 11px; }
      .totals { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; margin-top: 18px; }
      .muted { color: #64748b; font-size: 13px; }
    </style>
  </head>
  <body>
    <div class="header">
      <div>
        <p class="muted">Travel Agency System</p>
        <h1>Payment Receipt</h1>
        <p class="muted" style="margin-top: 8px;">Receipt Number: ${escapeHtml(receipt.receiptNumber)}</p>
      </div>
      <div style="text-align:right;">
        <p class="label">Reference Number</p>
        <p class="value">${escapeHtml(receipt.referenceNumber)}</p>
        <p class="muted" style="margin-top: 8px;">${escapeHtml(formatDate(receipt.paymentDate))}</p>
      </div>
    </div>

    <div class="block grid">
      <div>
        <p class="label">Agency</p>
        <p class="value">${escapeHtml(receipt.agency.agencyName)}</p>
        <p class="muted">${escapeHtml(receipt.agency.country)} - ${escapeHtml(receipt.agency.city)}</p>
      </div>
      <div>
        <p class="label">Agent Number</p>
        <p class="value">${escapeHtml(receipt.agency.agentNumber)}</p>
      </div>
      <div>
        <p class="label">Received By</p>
        <p class="value">${escapeHtml(receipt.receivedBy)}</p>
      </div>
      <div>
        <p class="label">Payment City</p>
        <p class="value">${escapeHtml(receipt.paymentCity)}</p>
      </div>
      <div>
        <p class="label">Payment Method</p>
        <p class="value">${escapeHtml(formatPaymentMethodLabel(receipt.paymentMethod))}</p>
      </div>
      <div>
        <p class="label">Remarks</p>
        <p class="value">${escapeHtml(receipt.remarks || 'No remarks')}</p>
      </div>
    </div>

    <div class="block">
      <p class="label">Allocated Groups</p>
      <table>
        <thead>
          <tr>
            <th>Group Number</th>
            <th>Group Name</th>
            <th>Passengers</th>
            <th>Group Total</th>
            <th>Allocated</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>

      <div class="totals">
        <div>
          <p class="label">Current Payment</p>
          <p class="value">${escapeHtml(formatCurrency(receipt.currentPaymentAmount))}</p>
        </div>
        <div>
          <p class="label">Total Allocated</p>
          <p class="value">${escapeHtml(formatCurrency(receipt.totalAllocatedAmount))}</p>
        </div>
        <div>
          <p class="label">Groups Covered</p>
          <p class="value">${receipt.groups.length}</p>
        </div>
      </div>
    </div>
  </body>
</html>`
}

export function PaymentsPage() {
  const user = useAuthStore((state) => state.user)
  const isSuperAdmin = user?.role === 'SUPER_ADMIN'
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedCountry, setSelectedCountry] = useState('')
  const [selectedCity, setSelectedCity] = useState('')
  const [selectedAgencyId, setSelectedAgencyId] = useState('')
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null)
  const [historyStatus, setHistoryStatus] = useState<'' | PaymentStatus>('')
  const [historyMethod, setHistoryMethod] = useState<'' | PaymentMethod>('')
  const [sortBy, setSortBy] = useState<'createdAt' | 'paidAt' | 'amount' | 'reference' | 'status'>(
    'createdAt',
  )
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([])
  const [entryForm, setEntryForm] = useState({
    paymentDate: getTodayInputValue(),
    receivedByUserId: '',
    paymentCity: '',
    reference: '',
    paymentMethod: 'BANK_TRANSFER' as PaymentMethod,
    remarks: '',
    currentPaymentAmount: '',
  })
  const [entryFeedback, setEntryFeedback] = useState<{
    type: 'success' | 'error'
    title: string
    description: string
  } | null>(null)
  const [receiptPreview, setReceiptPreview] = useState<PaymentReceipt | null>(null)
  const [isDownloadingReceipt, setIsDownloadingReceipt] = useState(false)
  const { searchText, debouncedSearchText, updateSearchText } = useDebouncedSearch()

  const agenciesQuery = useAgenciesQuery({
    page: 1,
    pageSize: 250,
    sortBy: 'name',
    sortOrder: 'asc',
  })
  const usersQuery = useUsersQuery()

  const agencies = agenciesQuery.data?.data ?? []
  const users = usersQuery.data ?? []

  const countryOptions = useMemo(
    () =>
      Array.from(new Set(agencies.map((agency) => normalizeAgencyLocation(agency.country)))).sort(
        (left, right) => left.localeCompare(right),
      ),
    [agencies],
  )

  const cityOptions = useMemo(
    () =>
      Array.from(
        new Set(
          agencies
            .filter((agency) =>
              selectedCountry ? normalizeAgencyLocation(agency.country) === selectedCountry : true,
            )
            .map((agency) => normalizeAgencyLocation(agency.city)),
        ),
      ).sort((left, right) => left.localeCompare(right)),
    [agencies, selectedCountry],
  )

  const filteredAgencies = useMemo(
    () =>
      agencies.filter((agency) => {
        const country = normalizeAgencyLocation(agency.country)
        const city = normalizeAgencyLocation(agency.city)

        return (
          (!selectedCountry || country === selectedCountry) &&
          (!selectedCity || city === selectedCity)
        )
      }),
    [agencies, selectedCity, selectedCountry],
  )

  const selectedAgency =
    agencies.find((agency) => agency.id === selectedAgencyId) ??
    filteredAgencies.find((agency) => agency.id === selectedAgencyId) ??
    null

  useEffect(() => {
    if (!agencies.length) {
      return
    }

    if (!isSuperAdmin && user?.agencyId) {
      const agency = agencies.find((item) => item.id === user.agencyId)

      if (!agency) {
        return
      }

      setSelectedCountry(normalizeAgencyLocation(agency.country))
      setSelectedCity(normalizeAgencyLocation(agency.city))
      setSelectedAgencyId(agency.id)
      return
    }

    if (selectedAgencyId) {
      return
    }

    const requestedAgencyId = searchParams.get('agencyId')
    const initialAgency =
      agencies.find((agency) => agency.id === requestedAgencyId) ?? agencies[0] ?? null

    if (!initialAgency) {
      return
    }

    setSelectedCountry(normalizeAgencyLocation(initialAgency.country))
    setSelectedCity(normalizeAgencyLocation(initialAgency.city))
    setSelectedAgencyId(initialAgency.id)
  }, [agencies, isSuperAdmin, searchParams, selectedAgencyId, user?.agencyId])

  useEffect(() => {
    if (!selectedCountry) {
      return
    }

    if (!countryOptions.includes(selectedCountry)) {
      setSelectedCountry(countryOptions[0] ?? '')
    }
  }, [countryOptions, selectedCountry])

  useEffect(() => {
    if (!selectedCountry) {
      return
    }

    if (!cityOptions.includes(selectedCity)) {
      setSelectedCity(cityOptions[0] ?? '')
    }
  }, [cityOptions, selectedCity, selectedCountry])

  useEffect(() => {
    if (filteredAgencies.length === 0) {
      if (selectedAgencyId) {
        setSelectedAgencyId('')
      }
      return
    }

    if (!filteredAgencies.some((agency) => agency.id === selectedAgencyId)) {
      setSelectedAgencyId(filteredAgencies[0]?.id ?? '')
    }
  }, [filteredAgencies, selectedAgencyId])

  useEffect(() => {
    if (!selectedAgencyId) {
      return
    }

    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      next.set('agencyId', selectedAgencyId)
      return next
    })
  }, [selectedAgencyId, setSearchParams])

  useEffect(() => {
    if (users.length === 0) {
      return
    }

    setEntryForm((current) => {
      if (current.receivedByUserId) {
        return current
      }

      const preferredUserId =
        users.find((item) => item.id === user?.id)?.id ?? users[0]?.id ?? ''

      return {
        ...current,
        receivedByUserId: preferredUserId,
      }
    })
  }, [user?.id, users])

  useEffect(() => {
    if (!selectedAgency) {
      return
    }

    setEntryForm((current) => ({
      ...current,
      paymentCity: normalizeAgencyLocation(selectedAgency.city),
    }))
    setSelectedGroupIds([])
    setEntryFeedback(null)
    setReceiptPreview(null)
    setSelectedPaymentId(null)
    setPage(1)
  }, [selectedAgencyId])

  const paymentEntryGroupsQuery = usePaymentEntryGroupsQuery(selectedAgencyId, Boolean(selectedAgencyId))

  const paymentListParams = useMemo(
    () => ({
      page,
      pageSize: 10,
      agencyId: selectedAgencyId || undefined,
      search: debouncedSearchText || undefined,
      status: historyStatus || undefined,
      method: historyMethod || undefined,
      sortBy,
      sortOrder,
    }),
    [debouncedSearchText, historyMethod, historyStatus, page, selectedAgencyId, sortBy, sortOrder],
  )

  const paymentsQuery = usePaymentsQuery(paymentListParams)
  const createPaymentEntryMutation = useCreatePaymentEntryMutation()
  const deletePaymentMutation = useDeletePaymentMutation()

  const receiptQuery = useQuery({
    queryKey: [...queryKeys.payments, 'receipt', selectedPaymentId],
    queryFn: () => getPaymentReceipt(selectedPaymentId ?? ''),
    enabled: Boolean(selectedPaymentId),
  })

  const entryContext = paymentEntryGroupsQuery.data
  const groups = entryContext?.groups ?? []
  const payments = paymentsQuery.data?.data ?? []
  const meta = paymentsQuery.data?.meta
  const activeReceipt =
    receiptQuery.data ??
    (receiptPreview && receiptPreview.paymentId === selectedPaymentId ? receiptPreview : null)

  useEffect(() => {
    const availableGroupIds = new Set(groups.map((group) => group.groupId))
    setSelectedGroupIds((current) => current.filter((groupId) => availableGroupIds.has(groupId)))
  }, [groups])

  const selectedGroups = useMemo(
    () => groups.filter((group) => selectedGroupIds.includes(group.groupId)),
    [groups, selectedGroupIds],
  )

  const selectedGroupsSummary = useMemo(() => {
    const selectedGroupsTotal = Number(
      selectedGroups.reduce((total, group) => total + group.totalAmount, 0).toFixed(2),
    )
    const alreadyPaid = Number(
      selectedGroups.reduce((total, group) => total + group.paidAmount, 0).toFixed(2),
    )
    const remainingBalance = Number(
      selectedGroups.reduce((total, group) => total + group.remainingAmount, 0).toFixed(2),
    )

    return {
      selectedGroupsTotal,
      alreadyPaid,
      remainingBalance,
    }
  }, [selectedGroups])

  const currentPaymentAmount = Number(entryForm.currentPaymentAmount || 0)
  const currentPaymentAmountIsValid =
    entryForm.currentPaymentAmount.trim() !== '' &&
    Number.isFinite(currentPaymentAmount) &&
    currentPaymentAmount > 0
  const isOverPayment =
    currentPaymentAmountIsValid && currentPaymentAmount > selectedGroupsSummary.remainingBalance
  const remainingAfterCurrentPayment = Number(
    Math.max(selectedGroupsSummary.remainingBalance - (currentPaymentAmountIsValid ? currentPaymentAmount : 0), 0).toFixed(2),
  )
  const canSubmitPayment =
    Boolean(selectedAgencyId) &&
    selectedGroupIds.length > 0 &&
    currentPaymentAmountIsValid &&
    !isOverPayment &&
    entryForm.paymentDate.trim().length > 0 &&
    entryForm.paymentCity.trim().length > 0 &&
    entryForm.reference.trim().length > 0 &&
    !createPaymentEntryMutation.isPending

  if ((agenciesQuery.isPending && !agenciesQuery.data) || (usersQuery.isPending && !usersQuery.data)) {
    return <LoadingBlock label="Loading payment management workspace..." />
  }

  if (agenciesQuery.isError || usersQuery.isError) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Payment management could not be prepared"
        description="The agency list or user directory could not be loaded, so the professional payment screen is not ready yet."
      />
    )
  }

  async function handlePrintReceipt() {
    if (!activeReceipt) {
      return
    }

    const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=1024,height=768')

    if (!printWindow) {
      setEntryFeedback({
        type: 'error',
        title: 'Receipt window blocked',
        description: 'Please allow pop-ups in the browser to print the selected receipt.',
      })
      return
    }

    printWindow.document.open()
    printWindow.document.write(buildReceiptPrintDocument(activeReceipt))
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
  }

  async function handleDownloadReceiptPdf() {
    if (!selectedPaymentId) {
      return
    }

    setIsDownloadingReceipt(true)

    try {
      await downloadPaymentReceiptPdf(selectedPaymentId)
    } catch (error) {
      setEntryFeedback({
        type: 'error',
        title: 'Receipt PDF download failed',
        description: getApiErrorMessage(error),
      })
    } finally {
      setIsDownloadingReceipt(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Professional payment management"
        title="Record payments against unpaid and partially paid groups"
        description="This workflow keeps the selection order finance-friendly, auto-allocates the current payment across the selected groups, rejects overpayments, and refreshes reports, ledgers, outstanding balances, dashboard data, and payment history."
      />

      <Panel
        title="Payment Scope"
        description="Select the business scope first. Country filters cities, city filters agencies, and the chosen agency loads only unpaid and partially paid groups."
      >
        <div className="grid gap-4 md:grid-cols-4">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              Country
            </span>
            <select
              className="w-full rounded-2xl border border-white/10 bg-[rgba(7,15,27,0.55)] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/50"
              value={selectedCountry}
              disabled={!isSuperAdmin}
              onChange={(event) => {
                setSelectedCountry(event.target.value)
                setPage(1)
              }}
            >
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
              className="w-full rounded-2xl border border-white/10 bg-[rgba(7,15,27,0.55)] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/50"
              value={selectedCity}
              disabled={!isSuperAdmin}
              onChange={(event) => {
                setSelectedCity(event.target.value)
                setPage(1)
              }}
            >
              {cityOptions.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </label>

          <label className="block md:col-span-2">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              Agency
            </span>
            <select
              className="w-full rounded-2xl border border-white/10 bg-[rgba(7,15,27,0.55)] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/50"
              value={selectedAgencyId}
              onChange={(event) => {
                setSelectedAgencyId(event.target.value)
                setPage(1)
              }}
            >
              {filteredAgencies.map((agency) => (
                <option key={agency.id} value={agency.id}>
                  {agency.name} ({agency.code})
                </option>
              ))}
            </select>
          </label>

          <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
              Agency
            </p>
            <p className="mt-3 text-sm font-semibold text-white">
              {entryContext?.agency.agencyName ?? selectedAgency?.name ?? 'No agency selected'}
            </p>
            <p className="mt-1 text-sm text-slate-300">
              {entryContext?.agency.country ?? normalizeAgencyLocation(selectedAgency?.country ?? null)} -{' '}
              {entryContext?.agency.city ?? normalizeAgencyLocation(selectedAgency?.city ?? null)}
            </p>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
              Agent number
            </p>
            <p className="mt-3 text-sm font-semibold text-white">
              {entryContext?.agency.agentNumber ?? selectedAgency?.code ?? 'Pending'}
            </p>
            <p className="mt-1 text-sm text-slate-300">
              {formatNumber(groups.length)} outstanding groups currently available for payment.
            </p>
          </div>

          <div className="rounded-[24px] border border-cyan-300/20 bg-cyan-400/10 p-4 md:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-100">
              Outstanding balance in scope
            </p>
            <p className="mt-3 font-display text-3xl text-white">
              {formatCurrency(
                groups.reduce((total, group) => total + group.remainingAmount, 0),
              )}
            </p>
            <p className="mt-2 text-sm text-slate-200">
              Only unpaid and partially paid groups appear in the payment selection grid.
            </p>
          </div>
        </div>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-[1.35fr,0.95fr]">
        <Panel
          title="Outstanding Groups"
          description="Select one or more groups to build the current payment. Remaining balances are calculated from the live allocation history."
          action={
            groups.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                <button
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
                  type="button"
                  onClick={() => {
                    setSelectedGroupIds(groups.slice(0, 100).map((group) => group.groupId))
                  }}
                >
                  Select all visible
                </button>
                <button
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
                  type="button"
                  onClick={() => setSelectedGroupIds([])}
                >
                  Clear selection
                </button>
              </div>
            ) : null
          }
        >
          {paymentEntryGroupsQuery.isPending && !paymentEntryGroupsQuery.data ? (
            <LoadingBlock label="Loading unpaid and partially paid groups..." />
          ) : paymentEntryGroupsQuery.isError ? (
            <EmptyState
              icon={ShieldAlert}
              title="Groups could not be loaded"
              description="The selected agency did not return the payment-entry group list."
            />
          ) : groups.length === 0 ? (
            <EmptyState
              icon={CreditCard}
              title="No unpaid or partially paid groups"
              description="This agency currently has no remaining balances waiting for a payment."
            />
          ) : (
            <div className="space-y-4">
              <div className="rounded-[22px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-300">
                {formatNumber(selectedGroupIds.length)} of {formatNumber(groups.length)} groups selected
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-white/10 text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-[0.18em] text-slate-400">
                      <th className="px-3 py-3">Select</th>
                      <th className="px-3 py-3">Group Number</th>
                      <th className="px-3 py-3">Passengers</th>
                      <th className="px-3 py-3">Total Amount</th>
                      <th className="px-3 py-3">Paid</th>
                      <th className="px-3 py-3">Remaining</th>
                      <th className="px-3 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {groups.map((group) => {
                      const isSelected = selectedGroupIds.includes(group.groupId)

                      return (
                        <tr
                          key={group.groupId}
                          className={isSelected ? 'bg-cyan-400/5' : undefined}
                        >
                          <td className="px-3 py-3">
                            <input
                              className="h-4 w-4 rounded border-white/20 bg-transparent text-cyan-300"
                              type="checkbox"
                              checked={isSelected}
                              onChange={(event) => {
                                setSelectedGroupIds((current) => {
                                  if (event.target.checked) {
                                    return Array.from(new Set([...current, group.groupId])).slice(0, 100)
                                  }

                                  return current.filter((groupId) => groupId !== group.groupId)
                                })
                              }}
                            />
                          </td>
                          <td className="px-3 py-3">
                            <p className="font-semibold text-white">{group.groupNumber}</p>
                            <p className="mt-1 text-xs text-slate-400">
                              {group.groupName || 'Unnamed Group'}
                            </p>
                          </td>
                          <td className="px-3 py-3 text-slate-200">
                            {formatNumber(group.passengers)}
                          </td>
                          <td className="px-3 py-3 text-slate-200">
                            {formatCurrency(group.totalAmount)}
                          </td>
                          <td className="px-3 py-3 text-slate-200">
                            {formatCurrency(group.paidAmount)}
                          </td>
                          <td className="px-3 py-3 font-semibold text-white">
                            {formatCurrency(group.remainingAmount)}
                          </td>
                          <td className="px-3 py-3">
                            <StatusBadge label={group.statusLabel} tone={getSettlementTone(group.status)} />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Panel>

        <div className="space-y-6">
          <Panel
            title="Payment Information"
            description="The current payment is validated against the selected groups before it is saved and auto-allocated."
          >
            <div className="space-y-4">
              {entryFeedback ? (
                <div
                  className={
                    entryFeedback.type === 'success'
                      ? 'rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-50'
                      : 'rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100'
                  }
                >
                  <p className="font-semibold">{entryFeedback.title}</p>
                  <p className="mt-1">{entryFeedback.description}</p>
                </div>
              ) : null}

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                    Payment Date
                  </span>
                  <input
                    className="w-full rounded-2xl border border-white/10 bg-[rgba(7,15,27,0.55)] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/50"
                    type="date"
                    value={entryForm.paymentDate}
                    onChange={(event) =>
                      setEntryForm((current) => ({
                        ...current,
                        paymentDate: event.target.value,
                      }))
                    }
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                    Received By
                  </span>
                  <select
                    className="w-full rounded-2xl border border-white/10 bg-[rgba(7,15,27,0.55)] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/50"
                    value={entryForm.receivedByUserId}
                    onChange={(event) =>
                      setEntryForm((current) => ({
                        ...current,
                        receivedByUserId: event.target.value,
                      }))
                    }
                  >
                    <option value="">Unassigned</option>
                    {users.map((entryUser) => (
                      <option key={entryUser.id} value={entryUser.id}>
                        {entryUser.firstName} {entryUser.lastName}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                    Payment City
                  </span>
                  <input
                    className="w-full rounded-2xl border border-white/10 bg-[rgba(7,15,27,0.55)] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/50"
                    value={entryForm.paymentCity}
                    onChange={(event) =>
                      setEntryForm((current) => ({
                        ...current,
                        paymentCity: event.target.value,
                      }))
                    }
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                    Reference Number
                  </span>
                  <input
                    className="w-full rounded-2xl border border-white/10 bg-[rgba(7,15,27,0.55)] px-4 py-3 text-sm uppercase text-white outline-none transition focus:border-cyan-300/50"
                    placeholder="Example: RCV-2026-001"
                    value={entryForm.reference}
                    onChange={(event) =>
                      setEntryForm((current) => ({
                        ...current,
                        reference: event.target.value.toUpperCase(),
                      }))
                    }
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                    Payment Method
                  </span>
                  <select
                    className="w-full rounded-2xl border border-white/10 bg-[rgba(7,15,27,0.55)] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/50"
                    value={entryForm.paymentMethod}
                    onChange={(event) =>
                      setEntryForm((current) => ({
                        ...current,
                        paymentMethod: event.target.value as PaymentMethod,
                      }))
                    }
                  >
                    {paymentMethodOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                    Current Payment
                  </span>
                  <input
                    className="w-full rounded-2xl border border-white/10 bg-[rgba(7,15,27,0.55)] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/50"
                    min="0"
                    step="0.01"
                    type="number"
                    value={entryForm.currentPaymentAmount}
                    onChange={(event) =>
                      setEntryForm((current) => ({
                        ...current,
                        currentPaymentAmount: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>

              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Remarks
                </span>
                <textarea
                  className="min-h-24 w-full rounded-2xl border border-white/10 bg-[rgba(7,15,27,0.55)] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/50"
                  value={entryForm.remarks}
                  onChange={(event) =>
                    setEntryForm((current) => ({
                      ...current,
                      remarks: event.target.value,
                    }))
                  }
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  ['Selected Groups Total', selectedGroupsSummary.selectedGroupsTotal],
                  ['Already Paid', selectedGroupsSummary.alreadyPaid],
                  ['Current Payment', currentPaymentAmountIsValid ? currentPaymentAmount : 0],
                  ['Remaining Balance', remainingAfterCurrentPayment],
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

              {!currentPaymentAmountIsValid && entryForm.currentPaymentAmount.trim() !== '' ? (
                <p className="text-sm text-rose-200">Current payment must be greater than zero.</p>
              ) : null}

              {isOverPayment ? (
                <p className="text-sm text-rose-200">
                  Current payment cannot exceed the selected groups&apos; remaining balance.
                </p>
              ) : null}

              <button
                className="inline-flex w-full items-center justify-center rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300"
                type="button"
                disabled={!canSubmitPayment}
                onClick={() => {
                  if (!selectedAgencyId) {
                    setEntryFeedback({
                      type: 'error',
                      title: 'Agency is required',
                      description: 'Please select an agency before recording a payment.',
                    })
                    return
                  }

                  if (selectedGroupIds.length === 0) {
                    setEntryFeedback({
                      type: 'error',
                      title: 'Select at least one group',
                      description: 'Choose one or more unpaid or partially paid groups before saving.',
                    })
                    return
                  }

                  if (!currentPaymentAmountIsValid) {
                    setEntryFeedback({
                      type: 'error',
                      title: 'Current payment is invalid',
                      description: 'Payment amount must be greater than zero.',
                    })
                    return
                  }

                  if (!entryForm.paymentDate.trim()) {
                    setEntryFeedback({
                      type: 'error',
                      title: 'Payment date is required',
                      description: 'Please choose the payment date before saving.',
                    })
                    return
                  }

                  if (!entryForm.paymentCity.trim()) {
                    setEntryFeedback({
                      type: 'error',
                      title: 'Payment city is required',
                      description: 'Please enter the city where the payment was received.',
                    })
                    return
                  }

                  if (isOverPayment) {
                    setEntryFeedback({
                      type: 'error',
                      title: 'Overpayment rejected',
                      description: 'Current payment cannot be greater than the selected remaining balance.',
                    })
                    return
                  }

                  setEntryFeedback(null)

                  createPaymentEntryMutation.mutate(
                    {
                      agencyId: selectedAgencyId,
                      receivedByUserId: entryForm.receivedByUserId || undefined,
                      reference: entryForm.reference,
                      paymentDate: entryForm.paymentDate,
                      paymentCity: entryForm.paymentCity,
                      paymentMethod: entryForm.paymentMethod,
                      remarks: entryForm.remarks,
                      currentPaymentAmount,
                      selectedGroups: selectedGroupIds.map((groupId) => ({ groupId })),
                    },
                    {
                      onSuccess: (result) => {
                        setSelectedGroupIds([])
                        setSelectedPaymentId(result.payment.id)
                        setReceiptPreview(result.receipt)
                        setEntryFeedback({
                          type: 'success',
                          title: `Receipt ${result.receipt.receiptNumber} generated successfully.`,
                          description: `${result.receipt.groups.length} groups were included. Current Payment: ${formatCurrency(result.summary.currentPayment)}. Remaining Balance: ${formatCurrency(result.summary.remainingBalance)}.`,
                        })
                        setEntryForm((current) => ({
                          ...current,
                          reference: '',
                          remarks: '',
                          currentPaymentAmount: '',
                        }))
                        setPage(1)
                      },
                      onError: (error) => {
                        setEntryFeedback({
                          type: 'error',
                          title: 'Payment could not be saved',
                          description: getApiErrorMessage(error),
                        })
                      },
                    },
                  )
                }}
              >
                {createPaymentEntryMutation.isPending ? 'Saving payment...' : 'Save Payment'}
              </button>
            </div>
          </Panel>

          <Panel
            title="Receipt"
            description={
              activeReceipt
                ? 'Review the generated receipt, print it, or download the PDF version.'
                : 'Save a payment or select one from payment history to preview its receipt.'
            }
            action={
              activeReceipt ? (
                <div className="flex flex-wrap gap-2">
                  <button
                    className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
                    type="button"
                    onClick={() => {
                      void handlePrintReceipt()
                    }}
                  >
                    <Printer className="h-4 w-4" />
                    Print Receipt
                  </button>
                  <button
                    className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                    type="button"
                    disabled={isDownloadingReceipt}
                    onClick={() => {
                      void handleDownloadReceiptPdf()
                    }}
                  >
                    <Download className="h-4 w-4" />
                    {isDownloadingReceipt ? 'Preparing PDF...' : 'PDF Receipt'}
                  </button>
                </div>
              ) : null
            }
          >
            {!selectedPaymentId ? (
              <EmptyState
                icon={CreditCard}
                title="No receipt selected"
                description="The receipt panel becomes active as soon as you save a payment or choose one from history."
              />
            ) : receiptQuery.isPending && !activeReceipt ? (
              <LoadingBlock label="Loading receipt preview..." />
            ) : receiptQuery.isError && !activeReceipt ? (
              <EmptyState
                icon={ShieldAlert}
                title="Receipt could not be loaded"
                description="The selected payment was found, but its receipt details were not available."
              />
            ) : activeReceipt ? (
              <div className="space-y-4">
                <div className="rounded-[24px] border border-cyan-300/20 bg-cyan-400/10 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-100">
                    Receipt Number
                  </p>
                  <p className="mt-3 font-display text-3xl text-white">{activeReceipt.receiptNumber}</p>
                  <p className="mt-2 text-sm text-slate-200">
                    {formatDate(activeReceipt.paymentDate)} • {formatPaymentMethodLabel(activeReceipt.paymentMethod)}
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-[22px] border border-white/10 bg-[rgba(7,15,27,0.45)] px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                      Agency
                    </p>
                    <p className="mt-3 text-sm font-semibold text-white">
                      {activeReceipt.agency.agencyName}
                    </p>
                    <p className="mt-1 text-sm text-slate-300">
                      {activeReceipt.agency.country} - {activeReceipt.agency.city}
                    </p>
                  </div>
                  <div className="rounded-[22px] border border-white/10 bg-[rgba(7,15,27,0.45)] px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                      Received By
                    </p>
                    <p className="mt-3 text-sm font-semibold text-white">{activeReceipt.receivedBy}</p>
                    <p className="mt-1 text-sm text-slate-300">{activeReceipt.paymentCity}</p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  {[
                    ['Reference', activeReceipt.referenceNumber],
                    ['Current Payment', formatCurrency(activeReceipt.currentPaymentAmount)],
                    ['Allocated Total', formatCurrency(activeReceipt.totalAllocatedAmount)],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-[22px] border border-white/10 bg-[rgba(7,15,27,0.45)] px-4 py-4"
                    >
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                        {label}
                      </p>
                      <p className="mt-3 text-sm font-semibold text-white">{value}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-3">
                  {activeReceipt.groups.map((group) => (
                    <div
                      key={group.groupId}
                      className="rounded-[22px] border border-white/10 bg-white/[0.04] px-4 py-4"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-white">{group.groupNumber}</p>
                          <p className="mt-1 text-sm text-slate-300">
                            {group.groupName || 'Unnamed Group'} • {formatNumber(group.passengers)} pax
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-white">
                            {formatCurrency(group.allocatedAmount)}
                          </p>
                          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">
                            of {formatCurrency(group.groupTotalAmount)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {selectedPaymentId ? (
                  <button
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-100 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                    type="button"
                    disabled={deletePaymentMutation.isPending}
                    onClick={() => {
                      deletePaymentMutation.mutate(selectedPaymentId, {
                        onSuccess: () => {
                          setSelectedPaymentId(null)
                          setReceiptPreview(null)
                          setEntryFeedback({
                            type: 'success',
                            title: 'Payment deleted',
                            description: 'The selected payment and its allocations were removed successfully.',
                          })
                        },
                        onError: (error) => {
                          setEntryFeedback({
                            type: 'error',
                            title: 'Payment could not be deleted',
                            description: getApiErrorMessage(error),
                          })
                        },
                      })
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    {deletePaymentMutation.isPending ? 'Deleting payment...' : 'Delete Payment'}
                  </button>
                ) : null}
              </div>
            ) : null}
          </Panel>
        </div>
      </div>

      <Panel
        title="Payment History"
        description="Review payment history for the selected agency. Search covers agency name, receipt number, reference number, payment city, and received-by details."
      >
        <div className="grid gap-3 border-b border-white/10 pb-5 md:grid-cols-5">
          <SearchInput
            className="md:col-span-2"
            placeholder="Search payment history"
            value={searchText}
            onChange={(value) => {
              updateSearchText(value)
              setPage(1)
            }}
          />

          <select
            className="rounded-2xl border border-white/10 bg-[rgba(7,15,27,0.55)] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/50"
            value={historyStatus}
            onChange={(event) => {
              setHistoryStatus(event.target.value as '' | PaymentStatus)
              setPage(1)
            }}
          >
            {paymentStatusOptions.map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            className="rounded-2xl border border-white/10 bg-[rgba(7,15,27,0.55)] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/50"
            value={historyMethod}
            onChange={(event) => {
              setHistoryMethod(event.target.value as '' | PaymentMethod)
              setPage(1)
            }}
          >
            <option value="">All methods</option>
            {paymentMethodOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
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
              <option value="paidAt">Paid date</option>
              <option value="amount">Amount</option>
              <option value="reference">Reference</option>
              <option value="status">Status</option>
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
          {paymentsQuery.isPending && !paymentsQuery.data ? (
            <LoadingBlock label="Loading payment history..." />
          ) : paymentsQuery.isError ? (
            <EmptyState
              icon={ShieldAlert}
              title="Payment history could not be loaded"
              description="The ledger query did not return a valid payment history response."
            />
          ) : payments.length === 0 ? (
            <EmptyState
              icon={CreditCard}
              title="No payments found"
              description="Try broadening the filters or save the first payment for the selected agency."
            />
          ) : (
            payments.map((payment) => (
              <button
                key={payment.id}
                className={`w-full rounded-[24px] border px-4 py-4 text-left transition ${
                  payment.id === selectedPaymentId
                    ? 'border-cyan-300/40 bg-cyan-400/10'
                    : 'border-white/10 bg-[rgba(7,15,27,0.45)] hover:bg-white/[0.08]'
                }`}
                type="button"
                onClick={() => {
                  setSelectedPaymentId(payment.id)
                  setEntryFeedback(null)
                }}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {payment.receiptNumber ?? 'Receipt pending'} • {payment.reference}
                    </p>
                    <p className="mt-1 text-sm text-slate-300">
                      {formatCurrency(payment.amount, payment.currency)} •{' '}
                      {formatPaymentMethodLabel(payment.method)}
                    </p>
                    <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-400">
                      {payment.agency?.name ?? entryContext?.agency.agencyName ?? 'Agency scoped'} •{' '}
                      {payment.paymentCity ?? 'Unspecified'} • Updated{' '}
                      {formatRelativeStatusDate(payment.updatedAt)}
                    </p>
                    <p className="mt-2 text-xs uppercase tracking-[0.18em] text-emerald-200">
                      Allocated {formatCurrency(payment.allocatedAmount, payment.currency)} • Remaining{' '}
                      {formatCurrency(payment.remainingBalance, payment.currency)}
                    </p>
                  </div>

                  <div className="space-y-2 text-right">
                    <StatusBadge label={payment.status.replace(/_/g, ' ')} tone={getPaymentTone(payment.status)} />
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                      Paid {formatDate(payment.paidAt)}
                    </p>
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
    </div>
  )
}
