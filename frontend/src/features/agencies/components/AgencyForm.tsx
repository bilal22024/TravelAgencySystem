import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import type { AgencyPayload } from '@/features/agencies/api'
import { useAgencyLookupQuery } from '@/features/agencies/api'
import type { AgencyDetail } from '@/types/api'

type AgencyFormProps = {
  agency?: AgencyDetail | null
  disabled?: boolean
  onSubmit: (payload: AgencyPayload) => void
}

const defaultValues: AgencyPayload = {
  name: '',
  code: '',
  agencyType: 'PARENT',
  parentAgencyId: '',
  category: '',
  openingBalance: 0,
  primaryContactPerson: '',
  contactEmail: '',
  contactPhone: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  country: '',
  postalCode: '',
  notes: '',
  isActive: true,
  phoneNumbers: [],
  emailAddresses: [],
  documents: [],
}

export function AgencyForm({ agency, disabled, onSubmit }: AgencyFormProps) {
  const [formValues, setFormValues] = useState<AgencyPayload>(defaultValues)
  const parentLookupParams = useMemo(
    () => ({
      agencyType: 'PARENT' as const,
      isActive: 'true' as const,
      excludeAgencyId: agency?.id,
      limit: 100,
    }),
    [agency?.id],
  )
  const parentAgencyLookupQuery = useAgencyLookupQuery(parentLookupParams)

  useEffect(() => {
    if (!agency) {
      setFormValues(defaultValues)
      return
    }

    setFormValues({
      name: agency.name,
      code: agency.code,
      agencyType: agency.agencyType,
      parentAgencyId: agency.parentAgencyId ?? '',
      category: agency.category ?? '',
      openingBalance: agency.openingBalance ?? 0,
      primaryContactPerson: agency.primaryContactPerson ?? '',
      contactEmail: agency.contactEmail ?? '',
      contactPhone: agency.contactPhone ?? '',
      addressLine1: agency.addressLine1 ?? '',
      addressLine2: agency.addressLine2 ?? '',
      city: agency.city ?? '',
      state: agency.state ?? '',
      country: agency.country ?? '',
      postalCode: agency.postalCode ?? '',
      notes: agency.notes ?? '',
      isActive: agency.isActive,
      phoneNumbers:
        agency.phoneNumbers.length > 0
          ? agency.phoneNumbers.map((phoneNumber) => ({
              id: phoneNumber.id,
              label: phoneNumber.label ?? '',
              phoneNumber: phoneNumber.phoneNumber,
              isPrimary: phoneNumber.isPrimary,
              sortOrder: phoneNumber.sortOrder,
            }))
          : agency.contactPhone
            ? [
                {
                  label: 'Primary',
                  phoneNumber: agency.contactPhone,
                  isPrimary: true,
                  sortOrder: 0,
                },
              ]
            : [],
      emailAddresses:
        agency.emailAddresses.length > 0
          ? agency.emailAddresses.map((emailAddress) => ({
              id: emailAddress.id,
              label: emailAddress.label ?? '',
              email: emailAddress.email,
              isPrimary: emailAddress.isPrimary,
              sortOrder: emailAddress.sortOrder,
            }))
          : agency.contactEmail
            ? [
                {
                  label: 'Primary',
                  email: agency.contactEmail,
                  isPrimary: true,
                  sortOrder: 0,
                },
              ]
            : [],
      documents: agency.documents.map((document) => ({
        id: document.id,
        documentName: document.documentName,
        documentType: document.documentType ?? '',
        fileUrl: document.fileUrl ?? '',
        notes: document.notes ?? '',
      })),
    })
  }, [agency])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit(formValues)
  }

  function updatePhoneRow(index: number, field: 'label' | 'phoneNumber', value: string) {
    setFormValues((current) => ({
      ...current,
      phoneNumbers: current.phoneNumbers.map((phoneNumber, phoneIndex) =>
        phoneIndex === index ? { ...phoneNumber, [field]: value } : phoneNumber,
      ),
    }))
  }

  function updateEmailRow(index: number, field: 'label' | 'email', value: string) {
    setFormValues((current) => ({
      ...current,
      emailAddresses: current.emailAddresses.map((emailAddress, emailIndex) =>
        emailIndex === index ? { ...emailAddress, [field]: value } : emailAddress,
      ),
    }))
  }

  function updateDocumentRow(
    index: number,
    field: 'documentName' | 'documentType' | 'fileUrl' | 'notes',
    value: string,
  ) {
    setFormValues((current) => ({
      ...current,
      documents: current.documents.map((document, documentIndex) =>
        documentIndex === index ? { ...document, [field]: value } : document,
      ),
    }))
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        {[
          ['name', 'Agency name'],
          ['code', 'Agency code'],
          ['category', 'Agency category'],
          ['primaryContactPerson', 'Primary contact person'],
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

      <div className="grid gap-4 md:grid-cols-3">
        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            Agency type
          </span>
          <select
            className="w-full rounded-2xl border border-white/10 bg-[rgba(7,15,27,0.55)] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/50"
            value={formValues.agencyType}
            onChange={(event) =>
              setFormValues((current) => ({
                ...current,
                agencyType: event.target.value as AgencyPayload['agencyType'],
                parentAgencyId: event.target.value === 'BRANCH' ? current.parentAgencyId : '',
              }))
            }
          >
            <option value="PARENT">Parent Agency</option>
            <option value="BRANCH">Branch Agency</option>
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            Parent agency
          </span>
          <select
            className="w-full rounded-2xl border border-white/10 bg-[rgba(7,15,27,0.55)] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/50 disabled:cursor-not-allowed disabled:opacity-60"
            value={formValues.parentAgencyId}
            disabled={formValues.agencyType !== 'BRANCH'}
            onChange={(event) =>
              setFormValues((current) => ({
                ...current,
                parentAgencyId: event.target.value,
              }))
            }
          >
            <option value="">
              {formValues.agencyType === 'BRANCH' ? 'Select parent agency' : 'Not required'}
            </option>
            {(parentAgencyLookupQuery.data ?? []).map((parentAgency) => (
              <option key={parentAgency.id} value={parentAgency.id}>
                {parentAgency.name} ({parentAgency.code})
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            Opening balance
          </span>
          <input
            className="w-full rounded-2xl border border-white/10 bg-[rgba(7,15,27,0.55)] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/50"
            min={0}
            step="0.01"
            type="number"
            value={formValues.openingBalance}
            onChange={(event) =>
              setFormValues((current) => ({
                ...current,
                openingBalance: Number(event.target.value) || 0,
              }))
            }
          />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {[
          ['addressLine1', 'Address line 1'],
          ['addressLine2', 'Address line 2'],
          ['state', 'State or province'],
          ['postalCode', 'Postal code'],
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

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                Phone numbers
              </p>
              <p className="mt-1 text-sm text-slate-300">Store multiple operational contacts.</p>
            </div>
            <button
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
              type="button"
              onClick={() =>
                setFormValues((current) => ({
                  ...current,
                  phoneNumbers: [
                    ...current.phoneNumbers,
                    {
                      label: '',
                      phoneNumber: '',
                      isPrimary: current.phoneNumbers.length === 0,
                      sortOrder: current.phoneNumbers.length,
                    },
                  ],
                }))
              }
            >
              <Plus className="h-4 w-4" />
              Add phone
            </button>
          </div>

          <div className="space-y-3">
            {formValues.phoneNumbers.length === 0 ? (
              <p className="text-sm text-slate-400">No phone numbers added yet.</p>
            ) : (
              formValues.phoneNumbers.map((phoneNumber, index) => (
                <div
                  key={`${phoneNumber.id ?? 'new-phone'}-${index}`}
                  className="grid gap-3 rounded-2xl border border-white/10 bg-[rgba(7,15,27,0.45)] p-3"
                >
                  <div className="grid gap-3 md:grid-cols-[0.8fr,1.2fr,auto]">
                    <input
                      className="rounded-2xl border border-white/10 bg-[rgba(7,15,27,0.55)] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/50"
                      placeholder="Label"
                      value={phoneNumber.label ?? ''}
                      onChange={(event) => updatePhoneRow(index, 'label', event.target.value)}
                    />
                    <input
                      className="rounded-2xl border border-white/10 bg-[rgba(7,15,27,0.55)] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/50"
                      placeholder="Phone number"
                      value={phoneNumber.phoneNumber}
                      onChange={(event) => updatePhoneRow(index, 'phoneNumber', event.target.value)}
                    />
                    <button
                      className="inline-flex items-center justify-center rounded-2xl border border-rose-400/20 bg-rose-500/10 px-3 py-3 text-rose-100 transition hover:bg-rose-500/20"
                      type="button"
                      onClick={() =>
                        setFormValues((current) => ({
                          ...current,
                          phoneNumbers: current.phoneNumbers.filter((_, phoneIndex) => phoneIndex !== index),
                        }))
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <label className="flex items-center gap-3 text-sm text-slate-300">
                    <input
                      checked={Boolean(phoneNumber.isPrimary)}
                      className="h-4 w-4 rounded border-white/20 bg-transparent text-cyan-300"
                      type="checkbox"
                      onChange={() =>
                        setFormValues((current) => ({
                          ...current,
                          phoneNumbers: current.phoneNumbers.map((item, phoneIndex) => ({
                            ...item,
                            isPrimary: phoneIndex === index,
                          })),
                        }))
                      }
                    />
                    Set as primary phone
                  </label>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                Email addresses
              </p>
              <p className="mt-1 text-sm text-slate-300">Store multiple finance and ops emails.</p>
            </div>
            <button
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
              type="button"
              onClick={() =>
                setFormValues((current) => ({
                  ...current,
                  emailAddresses: [
                    ...current.emailAddresses,
                    {
                      label: '',
                      email: '',
                      isPrimary: current.emailAddresses.length === 0,
                      sortOrder: current.emailAddresses.length,
                    },
                  ],
                }))
              }
            >
              <Plus className="h-4 w-4" />
              Add email
            </button>
          </div>

          <div className="space-y-3">
            {formValues.emailAddresses.length === 0 ? (
              <p className="text-sm text-slate-400">No email addresses added yet.</p>
            ) : (
              formValues.emailAddresses.map((emailAddress, index) => (
                <div
                  key={`${emailAddress.id ?? 'new-email'}-${index}`}
                  className="grid gap-3 rounded-2xl border border-white/10 bg-[rgba(7,15,27,0.45)] p-3"
                >
                  <div className="grid gap-3 md:grid-cols-[0.8fr,1.2fr,auto]">
                    <input
                      className="rounded-2xl border border-white/10 bg-[rgba(7,15,27,0.55)] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/50"
                      placeholder="Label"
                      value={emailAddress.label ?? ''}
                      onChange={(event) => updateEmailRow(index, 'label', event.target.value)}
                    />
                    <input
                      className="rounded-2xl border border-white/10 bg-[rgba(7,15,27,0.55)] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/50"
                      placeholder="Email address"
                      value={emailAddress.email}
                      onChange={(event) => updateEmailRow(index, 'email', event.target.value)}
                    />
                    <button
                      className="inline-flex items-center justify-center rounded-2xl border border-rose-400/20 bg-rose-500/10 px-3 py-3 text-rose-100 transition hover:bg-rose-500/20"
                      type="button"
                      onClick={() =>
                        setFormValues((current) => ({
                          ...current,
                          emailAddresses: current.emailAddresses.filter((_, emailIndex) => emailIndex !== index),
                        }))
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <label className="flex items-center gap-3 text-sm text-slate-300">
                    <input
                      checked={Boolean(emailAddress.isPrimary)}
                      className="h-4 w-4 rounded border-white/20 bg-transparent text-cyan-300"
                      type="checkbox"
                      onChange={() =>
                        setFormValues((current) => ({
                          ...current,
                          emailAddresses: current.emailAddresses.map((item, emailIndex) => ({
                            ...item,
                            isPrimary: emailIndex === index,
                          })),
                        }))
                      }
                    />
                    Set as primary email
                  </label>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              Documents
            </p>
            <p className="mt-1 text-sm text-slate-300">Track document names and file references.</p>
          </div>
          <button
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
            type="button"
            onClick={() =>
              setFormValues((current) => ({
                ...current,
                documents: [
                  ...current.documents,
                  {
                    documentName: '',
                    documentType: '',
                    fileUrl: '',
                    notes: '',
                  },
                ],
              }))
            }
          >
            <Plus className="h-4 w-4" />
            Add document
          </button>
        </div>

        <div className="space-y-3">
          {formValues.documents.length === 0 ? (
            <p className="text-sm text-slate-400">No documents added yet.</p>
          ) : (
            formValues.documents.map((document, index) => (
              <div
                key={`${document.id ?? 'new-document'}-${index}`}
                className="grid gap-3 rounded-2xl border border-white/10 bg-[rgba(7,15,27,0.45)] p-3"
              >
                <div className="grid gap-3 md:grid-cols-2">
                  <input
                    className="rounded-2xl border border-white/10 bg-[rgba(7,15,27,0.55)] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/50"
                    placeholder="Document name"
                    value={document.documentName}
                    onChange={(event) =>
                      updateDocumentRow(index, 'documentName', event.target.value)
                    }
                  />
                  <input
                    className="rounded-2xl border border-white/10 bg-[rgba(7,15,27,0.55)] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/50"
                    placeholder="Document type"
                    value={document.documentType ?? ''}
                    onChange={(event) =>
                      updateDocumentRow(index, 'documentType', event.target.value)
                    }
                  />
                  <input
                    className="rounded-2xl border border-white/10 bg-[rgba(7,15,27,0.55)] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/50 md:col-span-2"
                    placeholder="File URL"
                    value={document.fileUrl ?? ''}
                    onChange={(event) => updateDocumentRow(index, 'fileUrl', event.target.value)}
                  />
                </div>
                <textarea
                  className="min-h-24 rounded-2xl border border-white/10 bg-[rgba(7,15,27,0.55)] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/50"
                  placeholder="Document notes"
                  value={document.notes ?? ''}
                  onChange={(event) => updateDocumentRow(index, 'notes', event.target.value)}
                />
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-100 transition hover:bg-rose-500/20"
                  type="button"
                  onClick={() =>
                    setFormValues((current) => ({
                      ...current,
                      documents: current.documents.filter((_, documentIndex) => documentIndex !== index),
                    }))
                  }
                >
                  <Trash2 className="h-4 w-4" />
                  Remove document
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <label className="block">
        <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
          Notes and remarks
        </span>
        <textarea
          className="min-h-28 w-full rounded-2xl border border-white/10 bg-[rgba(7,15,27,0.55)] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/50"
          value={formValues.notes ?? ''}
          onChange={(event) =>
            setFormValues((current) => ({
              ...current,
              notes: event.target.value,
            }))
          }
        />
      </label>

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
