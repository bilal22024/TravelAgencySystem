import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import type { AgencyPayload } from '@/features/agencies/api'
import { useAgencyLookupQuery } from '@/features/agencies/api'
import { useCityLookupQuery, useCountryLookupQuery, useCreateCityMutation } from '@/features/locations/api'
import { PortalSurface } from '@/components/ui/PortalSurface'
import { SearchableSelect } from '@/components/ui/SearchableSelect'
import type { AgencyDetail } from '@/types/api'

type AgencyFormProps = {
  agency?: AgencyDetail | null
  disabled?: boolean
  canManageLocations?: boolean
  resetToken?: number
  onDirtyChange?: (dirty: boolean) => void
  onSubmit: (payload: AgencyPayload) => Promise<void> | void
}

function createDefaultValues(): AgencyPayload {
  return {
    name: '',
    code: '',
    agencyType: 'PARENT',
    parentAgencyId: '',
    countryId: '',
    cityId: '',
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
}

function createValuesFromAgency(agency?: AgencyDetail | null): AgencyPayload {
  if (!agency) {
    return createDefaultValues()
  }

  return {
    name: agency.name,
    code: agency.code,
    agencyType: agency.agencyType,
    parentAgencyId: agency.parentAgencyId ?? '',
    countryId: agency.countryRef?.id ?? '',
    cityId: agency.cityRef?.id ?? '',
    category: agency.category ?? '',
    openingBalance: agency.openingBalance ?? 0,
    primaryContactPerson: agency.primaryContactPerson ?? '',
    contactEmail: agency.contactEmail ?? '',
    contactPhone: agency.contactPhone ?? '',
    addressLine1: agency.addressLine1 ?? '',
    addressLine2: agency.addressLine2 ?? '',
    city: agency.cityRef?.name ?? agency.city ?? '',
    state: agency.state ?? '',
    country: agency.countryRef?.name ?? agency.country ?? '',
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
  }
}

function serializePayloadForDirtyCheck(payload: AgencyPayload) {
  return JSON.stringify({
    ...payload,
    code: payload.code.trim().toUpperCase(),
    parentAgencyId: payload.parentAgencyId?.trim() || '',
    countryId: payload.countryId?.trim() || '',
    cityId: payload.cityId?.trim() || '',
    category: payload.category?.trim() || '',
    primaryContactPerson: payload.primaryContactPerson?.trim() || '',
    contactEmail: payload.contactEmail?.trim() || '',
    contactPhone: payload.contactPhone?.trim() || '',
    addressLine1: payload.addressLine1?.trim() || '',
    addressLine2: payload.addressLine2?.trim() || '',
    city: payload.city?.trim() || '',
    state: payload.state?.trim() || '',
    country: payload.country?.trim() || '',
    postalCode: payload.postalCode?.trim() || '',
    notes: payload.notes?.trim() || '',
    phoneNumbers: payload.phoneNumbers.map((phoneNumber) => ({
      label: phoneNumber.label?.trim() || '',
      phoneNumber: phoneNumber.phoneNumber.trim(),
      isPrimary: Boolean(phoneNumber.isPrimary),
      sortOrder: phoneNumber.sortOrder ?? 0,
    })),
    emailAddresses: payload.emailAddresses.map((emailAddress) => ({
      label: emailAddress.label?.trim() || '',
      email: emailAddress.email.trim().toLowerCase(),
      isPrimary: Boolean(emailAddress.isPrimary),
      sortOrder: emailAddress.sortOrder ?? 0,
    })),
    documents: payload.documents.map((document) => ({
      documentName: document.documentName.trim(),
      documentType: document.documentType?.trim() || '',
      fileUrl: document.fileUrl?.trim() || '',
      notes: document.notes?.trim() || '',
    })),
  })
}

export function AgencyForm({
  agency,
  disabled,
  canManageLocations,
  resetToken,
  onDirtyChange,
  onSubmit,
}: AgencyFormProps) {
  const initialValues = useMemo(() => createValuesFromAgency(agency), [agency, resetToken])
  const [formValues, setFormValues] = useState<AgencyPayload>(initialValues)
  const [countrySearch, setCountrySearch] = useState('')
  const [citySearch, setCitySearch] = useState('')
  const [isAddCityDialogOpen, setIsAddCityDialogOpen] = useState(false)
  const [newCityName, setNewCityName] = useState('')
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
  const countryLookupQuery = useCountryLookupQuery({
    search: countrySearch.trim() || undefined,
    limit: 100,
  })
  const cityLookupQuery = useCityLookupQuery(
    {
      countryId: formValues.countryId || undefined,
      search: citySearch.trim() || undefined,
      limit: 100,
    },
    Boolean(formValues.countryId),
  )
  const createCityMutation = useCreateCityMutation()

  useEffect(() => {
    setFormValues(initialValues)
    setCountrySearch('')
    setCitySearch('')
    setIsAddCityDialogOpen(false)
    setNewCityName('')
  }, [initialValues])

  useEffect(() => {
    onDirtyChange?.(
      serializePayloadForDirtyCheck(formValues) !== serializePayloadForDirtyCheck(initialValues),
    )
  }, [formValues, initialValues, onDirtyChange])

  const countryOptions = (countryLookupQuery.data ?? []).map((country) => ({
    id: country.id,
    label: country.name,
    description: `${country._count.cities} ${country._count.cities === 1 ? 'city' : 'cities'}`,
  }))
  const cityOptions = (cityLookupQuery.data ?? []).map((city) => ({
    id: city.id,
    label: city.name,
    description: city.country.name,
  }))
  const selectedCountryOption = formValues.countryId
    ? { id: formValues.countryId, label: formValues.country || 'Selected country' }
    : null
  const selectedCityOption = formValues.cityId
    ? { id: formValues.cityId, label: formValues.city || 'Selected city' }
    : null
  const addCityErrorMessage =
    createCityMutation.error instanceof Error
      ? createCityMutation.error.message
      : 'The city could not be created. Please review the value and try again.'

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    await Promise.resolve(onSubmit(formValues))

    if (!agency) {
      setFormValues(createDefaultValues())
      setCountrySearch('')
      setCitySearch('')
      setIsAddCityDialogOpen(false)
      setNewCityName('')
    }
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

  async function handleCreateCity() {
    if (!formValues.countryId) {
      return
    }

    const createdCity = await createCityMutation.mutateAsync({
      countryId: formValues.countryId,
      name: newCityName,
    })

    setFormValues((current) => ({
      ...current,
      cityId: createdCity.id,
      city: createdCity.name,
    }))
    setCitySearch('')
    setNewCityName('')
    setIsAddCityDialogOpen(false)
  }

  const addCityDialog = isAddCityDialogOpen ? (
    <PortalSurface>
      <div className="fixed inset-0 z-[240] flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-sm">
        <div
          className="w-full max-w-md rounded-[28px] border border-white/10 bg-[rgba(7,15,27,0.98)] p-6 shadow-panel"
          role="dialog"
          aria-modal="true"
          aria-label="Add city"
        >
          <div className="space-y-4">
            <div>
              <p className="text-lg font-semibold text-white">Add city</p>
              <p className="mt-1 text-sm text-slate-300">
                New city for {formValues.country || 'the selected country'}.
              </p>
            </div>
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                City name
              </span>
              <input
                className="w-full rounded-2xl border border-white/10 bg-[rgba(7,15,27,0.55)] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/50"
                value={newCityName}
                onChange={(event) => {
                  if (createCityMutation.isError) {
                    createCityMutation.reset()
                  }

                  setNewCityName(event.target.value)
                }}
              />
            </label>
            {createCityMutation.isError ? (
              <p className="text-sm text-rose-200">{addCityErrorMessage}</p>
            ) : null}
            <div className="flex justify-end gap-3">
              <button
                className="app-button-ghost h-10"
                type="button"
                onClick={() => {
                  setIsAddCityDialogOpen(false)
                  setNewCityName('')
                  createCityMutation.reset()
                }}
              >
                Cancel
              </button>
              <button
                className="app-button-secondary h-10"
                type="button"
                disabled={!newCityName.trim() || createCityMutation.isPending}
                onClick={() => {
                  void handleCreateCity()
                }}
              >
                {createCityMutation.isPending ? 'Saving...' : 'Save city'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </PortalSurface>
  ) : null

  return (
    <>
      <form className="grid gap-4" onSubmit={(event) => void handleSubmit(event)}>
        <fieldset className="grid gap-4 disabled:opacity-90" disabled={disabled}>
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
            <SearchableSelect
              label="Country"
              placeholder="Select country"
              value={selectedCountryOption}
              searchValue={countrySearch}
              searchPlaceholder="Search countries"
              onSearchChange={setCountrySearch}
              onSelect={(option) => {
                setFormValues((current) => ({
                  ...current,
                  countryId: option?.id ?? '',
                  country: option?.label ?? '',
                  cityId: '',
                  city: '',
                }))
                setCitySearch('')
              }}
              options={countryOptions}
              emptyMessage="No matching countries were found."
              loading={countryLookupQuery.isPending}
              allowClear
            />
            <SearchableSelect
              label="City"
              placeholder={formValues.countryId ? 'Select city' : 'Select a country first'}
              value={selectedCityOption}
              searchValue={citySearch}
              searchPlaceholder="Search cities"
              onSearchChange={setCitySearch}
              onSelect={(option) => {
                setFormValues((current) => ({
                  ...current,
                  cityId: option?.id ?? '',
                  city: option?.label ?? '',
                }))
              }}
              options={cityOptions}
              emptyMessage={
                formValues.countryId
                  ? 'No matching cities were found for the selected country.'
                  : 'Select a country to load its cities.'
              }
              disabled={!formValues.countryId}
              loading={cityLookupQuery.isPending}
              allowClear
              footer={
                canManageLocations && formValues.countryId ? (
                  <button
                    className="app-button-secondary h-10 w-full"
                    type="button"
                    onClick={() => {
                      createCityMutation.reset()
                      setNewCityName('')
                      setIsAddCityDialogOpen(true)
                    }}
                  >
                    + Add City
                  </button>
                ) : null
              }
            />
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
        </fieldset>
      </form>
      {addCityDialog}
    </>
  )
}
