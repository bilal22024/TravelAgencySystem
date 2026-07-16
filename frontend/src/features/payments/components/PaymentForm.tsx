import { type FormEvent, useEffect, useState } from 'react'
import type { Agency, PaymentRecord, PublicUser } from '@/types/api'
import type { PaymentPayload } from '@/features/payments/api'

type PaymentFormProps = {
  agencies: Agency[]
  users: PublicUser[]
  payment?: PaymentRecord | null
  initialAgencyId?: string
  disabled?: boolean
  onSubmit: (payload: PaymentPayload) => void
}

const defaultValues: PaymentPayload = {
  agencyId: '',
  receivedByUserId: '',
  reference: '',
  amount: 0,
  currency: 'USD',
  method: 'BANK_TRANSFER',
  description: '',
  paidAt: '',
}

export function PaymentForm({
  agencies,
  users,
  payment,
  initialAgencyId,
  disabled,
  onSubmit,
}: PaymentFormProps) {
  const [formValues, setFormValues] = useState<PaymentPayload>(defaultValues)

  useEffect(() => {
    if (!payment) {
      const preferredAgencyId =
        agencies.find((agency) => agency.id === initialAgencyId)?.id ?? agencies[0]?.id ?? ''

      setFormValues({
        ...defaultValues,
        agencyId: preferredAgencyId,
        receivedByUserId: users[0]?.id ?? '',
      })
      return
    }

    setFormValues({
      agencyId: payment.agencyId,
      receivedByUserId: payment.receivedByUserId ?? '',
      reference: payment.reference,
      amount: Number(payment.amount),
      currency: payment.currency,
      method: payment.method,
      description: payment.description ?? '',
      paidAt: payment.paidAt?.slice(0, 10) ?? '',
    })
  }, [agencies, initialAgencyId, payment, users])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit(formValues)
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            Agency
          </span>
          <select
            className="w-full rounded-2xl border border-white/10 bg-[rgba(7,15,27,0.55)] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/50"
            value={formValues.agencyId}
            onChange={(event) =>
              setFormValues((current) => ({
                ...current,
                agencyId: event.target.value,
              }))
            }
          >
            {agencies.map((agency) => (
              <option key={agency.id} value={agency.id}>
                {agency.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            Received by
          </span>
          <select
            className="w-full rounded-2xl border border-white/10 bg-[rgba(7,15,27,0.55)] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/50"
            value={formValues.receivedByUserId}
            onChange={(event) =>
              setFormValues((current) => ({
                ...current,
                receivedByUserId: event.target.value,
              }))
            }
          >
            <option value="">Unassigned</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.firstName} {user.lastName}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {[
          ['reference', 'Reference'],
          ['currency', 'Currency'],
        ].map(([field, label]) => (
          <label key={field} className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              {label}
            </span>
            <input
              className="w-full rounded-2xl border border-white/10 bg-[rgba(7,15,27,0.55)] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/50"
              value={(formValues[field as keyof PaymentPayload] as string | undefined) ?? ''}
              onChange={(event) =>
                setFormValues((current) => ({
                  ...current,
                  [field]: event.target.value,
                }))
              }
            />
          </label>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            Amount
          </span>
          <input
            className="w-full rounded-2xl border border-white/10 bg-[rgba(7,15,27,0.55)] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/50"
            min={0}
            step="0.01"
            type="number"
            value={formValues.amount}
            onChange={(event) =>
              setFormValues((current) => ({
                ...current,
                amount: Number(event.target.value),
              }))
            }
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            Method
          </span>
          <select
            className="w-full rounded-2xl border border-white/10 bg-[rgba(7,15,27,0.55)] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/50"
            value={formValues.method}
            onChange={(event) =>
              setFormValues((current) => ({
                ...current,
                method: event.target.value as PaymentPayload['method'],
              }))
            }
          >
            {[
              'CASH',
              'BANK_TRANSFER',
              'CREDIT_CARD',
              'DEBIT_CARD',
              'ONLINE',
              'CHEQUE',
              'OTHER',
            ].map(
              (method) => (
                <option key={method} value={method}>
                  {method.replace(/_/g, ' ')}
                </option>
              ),
            )}
          </select>
        </label>
      </div>

      <div className="rounded-2xl border border-cyan-300/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-50">
        Payment status and remaining balance are calculated automatically from live allocations.
      </div>

      <label className="block">
        <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
          Paid date
        </span>
        <input
          className="w-full rounded-2xl border border-white/10 bg-[rgba(7,15,27,0.55)] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/50"
          type="date"
          value={formValues.paidAt}
          onChange={(event) =>
            setFormValues((current) => ({
              ...current,
              paidAt: event.target.value,
            }))
          }
        />
      </label>

      <label className="block">
        <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
          Description
        </span>
        <textarea
          className="min-h-24 w-full rounded-2xl border border-white/10 bg-[rgba(7,15,27,0.55)] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/50"
          value={formValues.description}
          onChange={(event) =>
            setFormValues((current) => ({
              ...current,
              description: event.target.value,
            }))
          }
        />
      </label>

      <button
        className="inline-flex items-center justify-center rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300"
        type="submit"
        disabled={disabled || !formValues.agencyId}
      >
        {payment ? 'Update payment' : 'Create payment'}
      </button>
    </form>
  )
}
