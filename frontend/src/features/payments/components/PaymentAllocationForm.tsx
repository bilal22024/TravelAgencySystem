import { type FormEvent, useEffect, useState } from 'react'
import type { GroupRecord, PaymentAllocation } from '@/types/api'
import type { PaymentAllocationPayload } from '@/features/payments/api'

type PaymentAllocationFormProps = {
  paymentId: string
  groups: GroupRecord[]
  allocation?: PaymentAllocation | null
  disabled?: boolean
  onSubmit: (payload: PaymentAllocationPayload) => void
}

export function PaymentAllocationForm({
  paymentId,
  groups,
  allocation,
  disabled,
  onSubmit,
}: PaymentAllocationFormProps) {
  const [groupId, setGroupId] = useState('')
  const [allocatedAmount, setAllocatedAmount] = useState(0)
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (allocation) {
      setGroupId(allocation.groupId)
      setAllocatedAmount(Number(allocation.allocatedAmount))
      setNotes(allocation.notes ?? '')
      return
    }

    setGroupId(groups[0]?.id ?? '')
    setAllocatedAmount(0)
    setNotes('')
  }, [allocation, groups])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    onSubmit({
      paymentId,
      groupId,
      allocatedAmount,
      notes,
    })
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      <label className="block">
        <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
          Group
        </span>
        <select
          className="w-full rounded-2xl border border-white/10 bg-[rgba(7,15,27,0.55)] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/50"
          value={groupId}
          onChange={(event) => setGroupId(event.target.value)}
        >
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
          Allocated amount
        </span>
        <input
          className="w-full rounded-2xl border border-white/10 bg-[rgba(7,15,27,0.55)] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/50"
          min={0}
          step="0.01"
          type="number"
          value={allocatedAmount}
          onChange={(event) => setAllocatedAmount(Number(event.target.value))}
        />
      </label>

      <label className="block">
        <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
          Notes
        </span>
        <textarea
          className="min-h-24 w-full rounded-2xl border border-white/10 bg-[rgba(7,15,27,0.55)] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/50"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </label>

      <button
        className="inline-flex items-center justify-center rounded-2xl bg-emerald-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300"
        type="submit"
        disabled={disabled || !groupId}
      >
        {allocation ? 'Update allocation' : 'Create allocation'}
      </button>
    </form>
  )
}
