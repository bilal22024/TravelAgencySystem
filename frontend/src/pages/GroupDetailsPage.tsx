import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Pencil, Save, ShieldAlert, Trash2 } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  useDeleteGroupMutation,
  useGroupDetailsQuery,
  useUpdateGroupMutation,
} from '@/features/groups/api'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingBlock } from '@/components/ui/LoadingBlock'
import { Panel } from '@/components/ui/Panel'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { getApiErrorMessage } from '@/lib/api-client'
import { formatCurrency, formatDate, formatNumber } from '@/lib/format'

type FormState = {
  code: string
  name: string
  travelerCount: string
  amountPerPax: string
}

type FormIssues = {
  code?: string
  name?: string
  travelerCount?: string
  amountPerPax?: string
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

function isNumericGroupNumber(value: string) {
  return /^\d+$/.test(value.trim())
}

function parsePositiveNumber(value: string) {
  const parsedValue = Number(value)
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 0
}

export function GroupDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const groupDetailsQuery = useGroupDetailsQuery(id, Boolean(id))
  const updateGroupMutation = useUpdateGroupMutation()
  const deleteGroupMutation = useDeleteGroupMutation()
  const [form, setForm] = useState<FormState>({
    code: '',
    name: '',
    travelerCount: '',
    amountPerPax: '',
  })
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [actionMessage, setActionMessage] = useState('')
  const [actionErrorMessage, setActionErrorMessage] = useState('')

  const group = groupDetailsQuery.data

  useEffect(() => {
    if (!group) {
      return
    }

    setForm({
      code: group.code,
      name: group.name,
      travelerCount: String(group.travelerCount),
      amountPerPax: group.amountPerPax ? String(group.amountPerPax) : '',
    })
  }, [group])

  const formIssues = useMemo<FormIssues>(() => {
    const issues: FormIssues = {}

    if (!form.code.trim()) {
      issues.code = 'Group Number is required.'
    } else if (!isNumericGroupNumber(form.code)) {
      issues.code = 'Group Number must contain numbers only.'
    }

    if (!form.name.trim()) {
      issues.name = 'Group Name is required.'
    }

    if (parsePositiveNumber(form.travelerCount) <= 0) {
      issues.travelerCount = 'Passengers must be greater than zero.'
    }

    if (parsePositiveNumber(form.amountPerPax) <= 0) {
      issues.amountPerPax = 'Amount Per Pax must be greater than zero.'
    }

    return issues
  }, [form])

  const hasValidationErrors = Boolean(
    formIssues.code || formIssues.name || formIssues.travelerCount || formIssues.amountPerPax,
  )
  const computedTotal = parsePositiveNumber(form.travelerCount) * parsePositiveNumber(form.amountPerPax)

  if (!id) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Group not found"
        description="A valid group identifier is required before the detail page can be opened."
      />
    )
  }

  if (groupDetailsQuery.isPending && !groupDetailsQuery.data) {
    return <LoadingBlock label="Loading detailed group information..." />
  }

  if (groupDetailsQuery.isError || !group) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Group details could not be loaded"
        description="The requested group could not be retrieved from the API."
      />
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Group Details"
        title={`Group ${group.code} • ${group.name}`}
        description="Review group-level business details, payment history, and edit the approved financial fields without touching payment or ledger calculation rules."
        action={
          <Link
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
            to="/groups"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Group List
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

      <div className="grid gap-6 xl:grid-cols-[1.2fr,0.8fr]">
        <Panel
          title="Group Overview"
          description="Operational and financial detail for this group record."
          action={
            <StatusBadge
              label={group.paymentStatusLabel}
              tone={getFinancialTone(group.paymentStatus)}
            />
          }
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[22px] border border-white/10 bg-[rgba(7,15,27,0.45)] px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Country</p>
              <p className="mt-3 text-sm font-semibold text-white">
                {group.agency?.country ?? 'Unspecified'}
              </p>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-[rgba(7,15,27,0.45)] px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">City</p>
              <p className="mt-3 text-sm font-semibold text-white">
                {group.agency?.city ?? 'Unspecified'}
              </p>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-[rgba(7,15,27,0.45)] px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Agency</p>
              <p className="mt-3 text-sm font-semibold text-white">
                {group.agency?.name ?? 'Unknown agency'}
              </p>
              <p className="mt-1 text-xs text-slate-400">{group.agency?.code ?? 'No code'}</p>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-[rgba(7,15,27,0.45)] px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Group Number</p>
              <p className="mt-3 text-sm font-semibold text-white">{group.code}</p>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-[rgba(7,15,27,0.45)] px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Group Name</p>
              <p className="mt-3 text-sm font-semibold text-white">{group.name}</p>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-[rgba(7,15,27,0.45)] px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Passengers</p>
              <p className="mt-3 text-sm font-semibold text-white">
                {formatNumber(group.travelerCount)}
              </p>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-[rgba(7,15,27,0.45)] px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Amount Per Pax</p>
              <p className="mt-3 text-sm font-semibold text-white">
                {formatCurrency(Number(group.amountPerPax ?? 0))}
              </p>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-[rgba(7,15,27,0.45)] px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Total Amount</p>
              <p className="mt-3 text-sm font-semibold text-white">
                {formatCurrency(Number(group.totalAmount ?? 0))}
              </p>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-[rgba(7,15,27,0.45)] px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Total Paid</p>
              <p className="mt-3 text-sm font-semibold text-white">
                {formatCurrency(group.paidAmount)}
              </p>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-[rgba(7,15,27,0.45)] px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Outstanding Balance</p>
              <p className="mt-3 text-sm font-semibold text-white">
                {formatCurrency(group.outstandingBalance)}
              </p>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-[rgba(7,15,27,0.45)] px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Created Date</p>
              <p className="mt-3 text-sm font-semibold text-white">{formatDate(group.createdAt)}</p>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-[rgba(7,15,27,0.45)] px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Last Updated</p>
              <p className="mt-3 text-sm font-semibold text-white">{formatDate(group.updatedAt)}</p>
            </div>
          </div>
        </Panel>

        <Panel
          title="Edit Group"
          description="Only the approved financial fields are editable here. Total Amount is recalculated automatically."
        >
          <div className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                Group Number
              </span>
              <input
                className={`w-full rounded-2xl border px-4 py-3 text-sm text-white outline-none transition ${
                  submitAttempted && formIssues.code
                    ? 'border-rose-400/60 bg-rose-500/10'
                    : 'border-white/10 bg-[rgba(7,15,27,0.55)] focus:border-cyan-300/50'
                }`}
                inputMode="numeric"
                pattern="[0-9]*"
                value={form.code}
                onChange={(event) => {
                  setForm((current) => ({ ...current, code: event.target.value }))
                  setActionMessage('')
                  setActionErrorMessage('')
                }}
              />
              {submitAttempted && formIssues.code ? (
                <p className="mt-2 text-xs text-rose-200">{formIssues.code}</p>
              ) : null}
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                Group Name
              </span>
              <input
                className={`w-full rounded-2xl border px-4 py-3 text-sm text-white outline-none transition ${
                  submitAttempted && formIssues.name
                    ? 'border-rose-400/60 bg-rose-500/10'
                    : 'border-white/10 bg-[rgba(7,15,27,0.55)] focus:border-cyan-300/50'
                }`}
                value={form.name}
                onChange={(event) => {
                  setForm((current) => ({ ...current, name: event.target.value }))
                  setActionMessage('')
                  setActionErrorMessage('')
                }}
              />
              {submitAttempted && formIssues.name ? (
                <p className="mt-2 text-xs text-rose-200">{formIssues.name}</p>
              ) : null}
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                Number of Passengers
              </span>
              <input
                className={`w-full rounded-2xl border px-4 py-3 text-sm text-white outline-none transition ${
                  submitAttempted && formIssues.travelerCount
                    ? 'border-rose-400/60 bg-rose-500/10'
                    : 'border-white/10 bg-[rgba(7,15,27,0.55)] focus:border-cyan-300/50'
                }`}
                min={1}
                type="number"
                value={form.travelerCount}
                onChange={(event) => {
                  setForm((current) => ({ ...current, travelerCount: event.target.value }))
                  setActionMessage('')
                  setActionErrorMessage('')
                }}
              />
              {submitAttempted && formIssues.travelerCount ? (
                <p className="mt-2 text-xs text-rose-200">{formIssues.travelerCount}</p>
              ) : null}
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                Amount Per Pax
              </span>
              <input
                className={`w-full rounded-2xl border px-4 py-3 text-sm text-white outline-none transition ${
                  submitAttempted && formIssues.amountPerPax
                    ? 'border-rose-400/60 bg-rose-500/10'
                    : 'border-white/10 bg-[rgba(7,15,27,0.55)] focus:border-cyan-300/50'
                }`}
                min={0}
                step="0.01"
                type="number"
                value={form.amountPerPax}
                onChange={(event) => {
                  setForm((current) => ({ ...current, amountPerPax: event.target.value }))
                  setActionMessage('')
                  setActionErrorMessage('')
                }}
              />
              {submitAttempted && formIssues.amountPerPax ? (
                <p className="mt-2 text-xs text-rose-200">{formIssues.amountPerPax}</p>
              ) : null}
            </label>

            <div className="rounded-[22px] border border-white/10 bg-[rgba(7,15,27,0.45)] px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Recalculated Total Group Amount
              </p>
              <p className="mt-3 text-lg font-semibold text-white">{formatCurrency(computedTotal)}</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300"
                type="button"
                disabled={updateGroupMutation.isPending || deleteGroupMutation.isPending}
                onClick={() => {
                  setSubmitAttempted(true)
                  setActionMessage('')
                  setActionErrorMessage('')

                  if (hasValidationErrors) {
                    return
                  }

                  updateGroupMutation.mutate(
                    {
                      id: group.id,
                      payload: {
                        code: form.code.trim(),
                        name: form.name.trim(),
                        travelerCount: Number(form.travelerCount),
                        amountPerPax: Number(form.amountPerPax),
                      },
                    },
                    {
                      onSuccess: () => {
                        setActionMessage('Group updated successfully.')
                      },
                      onError: (error) => {
                        setActionErrorMessage(getApiErrorMessage(error))
                      },
                    },
                  )
                }}
              >
                <Save className="h-4 w-4" />
                {updateGroupMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>

              <button
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-100 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                type="button"
                disabled={deleteGroupMutation.isPending || updateGroupMutation.isPending}
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
                      navigate('/groups')
                    },
                    onError: (error) => {
                      setActionErrorMessage(getApiErrorMessage(error))
                    },
                  })
                }}
              >
                <Trash2 className="h-4 w-4" />
                Delete Group
              </button>
            </div>
          </div>
        </Panel>
      </div>

      <Panel
        title="Payment History"
        description="Every payment allocation connected to this group, shown without changing existing payment or ledger calculations."
      >
        {group.paymentHistory.length === 0 ? (
          <EmptyState
            icon={Pencil}
            title="No payment history yet"
            description="This group has not received any payment allocations yet, so the outstanding balance remains fully open."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1100px] border-separate border-spacing-y-3">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  <th className="px-4 py-2">Payment Date</th>
                  <th className="px-4 py-2">Reference / Receipt</th>
                  <th className="px-4 py-2">Payment City</th>
                  <th className="px-4 py-2">Received By</th>
                  <th className="px-4 py-2">Method</th>
                  <th className="px-4 py-2 text-right">Payment Amount</th>
                  <th className="px-4 py-2 text-right">Allocated to Group</th>
                  <th className="px-4 py-2">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {group.paymentHistory.map((item) => (
                  <tr key={item.id} className="text-sm text-slate-100">
                    <td className="rounded-l-[20px] border-y border-l border-white/10 bg-white/[0.04] px-4 py-4">
                      {formatDate(item.payment.paidAt ?? item.payment.createdAt)}
                    </td>
                    <td className="border-y border-white/10 bg-white/[0.04] px-4 py-4">
                      <p className="font-medium text-white">{item.payment.reference}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {item.payment.receiptNumber ?? 'Receipt pending'}
                      </p>
                    </td>
                    <td className="border-y border-white/10 bg-white/[0.04] px-4 py-4">
                      {item.payment.paymentCity ?? 'Unspecified'}
                    </td>
                    <td className="border-y border-white/10 bg-white/[0.04] px-4 py-4">
                      {item.payment.receivedBy
                        ? `${item.payment.receivedBy.firstName} ${item.payment.receivedBy.lastName}`
                        : 'Unspecified'}
                    </td>
                    <td className="border-y border-white/10 bg-white/[0.04] px-4 py-4">
                      {item.payment.method.replace(/_/g, ' ')}
                    </td>
                    <td className="border-y border-white/10 bg-white/[0.04] px-4 py-4 text-right">
                      {formatCurrency(Number(item.payment.amount), item.payment.currency)}
                    </td>
                    <td className="border-y border-white/10 bg-white/[0.04] px-4 py-4 text-right font-semibold text-white">
                      {formatCurrency(Number(item.allocatedAmount), item.payment.currency)}
                    </td>
                    <td className="rounded-r-[20px] border-y border-r border-white/10 bg-white/[0.04] px-4 py-4 text-slate-300">
                      {item.notes || item.payment.description || 'No remarks'}
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
