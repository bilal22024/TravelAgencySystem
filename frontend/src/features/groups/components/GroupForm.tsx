import { type FormEvent, useEffect, useState } from 'react'
import type { Agency, GroupRecord } from '@/types/api'
import type { GroupPayload } from '@/features/groups/api'

type GroupFormProps = {
  agencies: Agency[]
  group?: GroupRecord | null
  disabled?: boolean
  onSubmit: (payload: GroupPayload) => void
}

const defaultValues: GroupPayload = {
  agencyId: '',
  name: '',
  code: '',
  description: '',
  destination: '',
  departureDate: '',
  returnDate: '',
  status: 'PLANNED',
  travelerCount: 0,
  notes: '',
}

export function GroupForm({ agencies, group, disabled, onSubmit }: GroupFormProps) {
  const [formValues, setFormValues] = useState<GroupPayload>(defaultValues)

  useEffect(() => {
    if (!group) {
      setFormValues({
        ...defaultValues,
        agencyId: agencies[0]?.id ?? '',
      })
      return
    }

    setFormValues({
      agencyId: group.agencyId,
      name: group.name,
      code: group.code,
      description: group.description ?? '',
      destination: group.destination,
      departureDate: group.departureDate.slice(0, 10),
      returnDate: group.returnDate.slice(0, 10),
      status: group.status,
      travelerCount: group.travelerCount,
      notes: group.notes ?? '',
    })
  }, [agencies, group])

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
            Status
          </span>
          <select
            className="w-full rounded-2xl border border-white/10 bg-[rgba(7,15,27,0.55)] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/50"
            value={formValues.status}
            onChange={(event) =>
              setFormValues((current) => ({
                ...current,
                status: event.target.value as GroupPayload['status'],
              }))
            }
          >
            {['PLANNED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map((status) => (
              <option key={status} value={status}>
                {status.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {[
          ['name', 'Group name'],
          ['code', 'Reference code'],
          ['destination', 'Destination'],
        ].map(([field, label]) => (
          <label key={field} className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              {label}
            </span>
            <input
              className="w-full rounded-2xl border border-white/10 bg-[rgba(7,15,27,0.55)] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/50"
              value={(formValues[field as keyof GroupPayload] as string | undefined) ?? ''}
              onChange={(event) =>
                setFormValues((current) => ({
                  ...current,
                  [field]: event.target.value,
                }))
              }
            />
          </label>
        ))}
        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            Travelers
          </span>
          <input
            className="w-full rounded-2xl border border-white/10 bg-[rgba(7,15,27,0.55)] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/50"
            min={0}
            type="number"
            value={formValues.travelerCount ?? 0}
            onChange={(event) =>
              setFormValues((current) => ({
                ...current,
                travelerCount: Number(event.target.value),
              }))
            }
          />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {[
          ['departureDate', 'Departure date'],
          ['returnDate', 'Return date'],
        ].map(([field, label]) => (
          <label key={field} className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              {label}
            </span>
            <input
              className="w-full rounded-2xl border border-white/10 bg-[rgba(7,15,27,0.55)] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/50"
              type="date"
              value={(formValues[field as keyof GroupPayload] as string | undefined) ?? ''}
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

      {[
        ['description', 'Description'],
        ['notes', 'Notes'],
      ].map(([field, label]) => (
        <label key={field} className="block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            {label}
          </span>
          <textarea
            className="min-h-24 w-full rounded-2xl border border-white/10 bg-[rgba(7,15,27,0.55)] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/50"
            value={(formValues[field as keyof GroupPayload] as string | undefined) ?? ''}
            onChange={(event) =>
              setFormValues((current) => ({
                ...current,
                [field]: event.target.value,
              }))
            }
          />
        </label>
      ))}

      <button
        className="inline-flex items-center justify-center rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300"
        type="submit"
        disabled={disabled || !formValues.agencyId}
      >
        {group ? 'Update group' : 'Create group'}
      </button>
    </form>
  )
}
