import { type FormEvent, useEffect, useState } from 'react'
import type { Agency } from '@/types/api'
import type { AgencyPayload } from '@/features/agencies/api'

type AgencyFormProps = {
  agency?: Agency | null
  disabled?: boolean
  onSubmit: (payload: AgencyPayload) => void
}

const defaultValues: AgencyPayload = {
  name: '',
  code: '',
  contactEmail: '',
  contactPhone: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  country: '',
  postalCode: '',
  isActive: true,
}

export function AgencyForm({ agency, disabled, onSubmit }: AgencyFormProps) {
  const [formValues, setFormValues] = useState<AgencyPayload>(defaultValues)

  useEffect(() => {
    if (!agency) {
      setFormValues(defaultValues)
      return
    }

    setFormValues({
      name: agency.name,
      code: agency.code,
      contactEmail: agency.contactEmail ?? '',
      contactPhone: agency.contactPhone ?? '',
      addressLine1: agency.addressLine1 ?? '',
      addressLine2: agency.addressLine2 ?? '',
      city: agency.city ?? '',
      state: agency.state ?? '',
      country: agency.country ?? '',
      postalCode: agency.postalCode ?? '',
      isActive: agency.isActive,
    })
  }, [agency])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit(formValues)
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        {[
          ['name', 'Agency name'],
          ['code', 'Agency code'],
          ['contactEmail', 'Contact email'],
          ['contactPhone', 'Contact phone'],
          ['city', 'City'],
          ['country', 'Country'],
        ].map(([field, label]) => (
          <label key={field} className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              {label}
            </span>
            <input
              className="w-full rounded-2xl border border-white/10 bg-[rgba(7,15,27,0.55)] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/50"
              value={(formValues[field as keyof AgencyPayload] as string | undefined) ?? ''}
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
        {[
          ['addressLine1', 'Address line 1'],
          ['addressLine2', 'Address line 2'],
          ['state', 'State or province'],
          ['postalCode', 'Postal code'],
        ].map(([field, label]) => (
          <label key={field} className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              {label}
            </span>
            <input
              className="w-full rounded-2xl border border-white/10 bg-[rgba(7,15,27,0.55)] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/50"
              value={(formValues[field as keyof AgencyPayload] as string | undefined) ?? ''}
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

      <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-200">
        <input
          checked={Boolean(formValues.isActive)}
          className="h-4 w-4 rounded border-white/20 bg-transparent text-cyan-300"
          type="checkbox"
          onChange={(event) =>
            setFormValues((current) => ({
              ...current,
              isActive: event.target.checked,
            }))
          }
        />
        Agency is active for operational use
      </label>

      <button
        className="inline-flex items-center justify-center rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300"
        type="submit"
        disabled={disabled}
      >
        {agency ? 'Update agency' : 'Create agency'}
      </button>
    </form>
  )
}
