import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiRequest, buildQueryString } from '@/lib/api-client'
import { queryKeys } from '@/lib/query-keys'
import type {
  Agency,
  AgencyDetail,
  AgencyListItem,
  AgencyLookupItem,
  AgencyType,
  EntityResponse,
  PaginatedCollectionResponse,
} from '@/types/api'

export type AgencyPayload = {
  name: string
  agencyType: AgencyType
  parentAgencyId?: string
  countryId?: string
  cityId?: string
  category?: string
  openingBalance: number
  primaryContactPerson?: string
  code: string
  contactEmail?: string
  contactPhone?: string
  addressLine1?: string
  addressLine2?: string
  city?: string
  state?: string
  country?: string
  postalCode?: string
  notes?: string
  isActive?: boolean
  phoneNumbers: Array<{
    id?: string
    label?: string
    phoneNumber: string
    isPrimary?: boolean
    sortOrder?: number
  }>
  emailAddresses: Array<{
    id?: string
    label?: string
    email: string
    isPrimary?: boolean
    sortOrder?: number
  }>
  documents: Array<{
    id?: string
    documentName: string
    documentType?: string
    fileUrl?: string
    notes?: string
  }>
}

export type AgencyListParams = {
  page: number
  pageSize: number
  search?: string
  isActive?: 'true' | 'false'
  agencyType?: AgencyType
  parentAgencyId?: string
  category?: string
  sortBy?: 'name' | 'code' | 'city' | 'country' | 'agencyType' | 'category' | 'createdAt' | 'updatedAt'
  sortOrder?: 'asc' | 'desc'
}

export type AgencyLookupParams = {
  search?: string
  agencyType?: AgencyType
  isActive?: 'true' | 'false'
  excludeAgencyId?: string
  limit?: number
}

function normalizeAgencyPayload(payload: AgencyPayload, mode: 'create' | 'update') {
  const emptyValue = mode === 'update' ? null : undefined
  const normalizedParentAgencyId = payload.parentAgencyId?.trim() || emptyValue

  return {
    ...payload,
    code: payload.code.trim().toUpperCase(),
    parentAgencyId: payload.agencyType === 'BRANCH' ? normalizedParentAgencyId : emptyValue,
    countryId: payload.countryId?.trim() || emptyValue,
    cityId: payload.cityId?.trim() || emptyValue,
    category: payload.category?.trim() || emptyValue,
    openingBalance: Number(payload.openingBalance ?? 0),
    primaryContactPerson: payload.primaryContactPerson?.trim() || emptyValue,
    contactEmail: payload.contactEmail?.trim() || emptyValue,
    contactPhone: payload.contactPhone?.trim() || emptyValue,
    addressLine1: payload.addressLine1?.trim() || emptyValue,
    addressLine2: payload.addressLine2?.trim() || emptyValue,
    city: payload.city?.trim() || emptyValue,
    state: payload.state?.trim() || emptyValue,
    country: payload.country?.trim() || emptyValue,
    postalCode: payload.postalCode?.trim() || emptyValue,
    notes: payload.notes?.trim() || emptyValue,
    phoneNumbers: payload.phoneNumbers
      .filter((phoneNumber) => phoneNumber.phoneNumber.trim())
      .map((phoneNumber, index) => ({
        id: phoneNumber.id,
        label: phoneNumber.label?.trim() || undefined,
        phoneNumber: phoneNumber.phoneNumber.trim(),
        isPrimary: phoneNumber.isPrimary ?? index === 0,
        sortOrder: phoneNumber.sortOrder ?? index,
      })),
    emailAddresses: payload.emailAddresses
      .filter((emailAddress) => emailAddress.email.trim())
      .map((emailAddress, index) => ({
        id: emailAddress.id,
        label: emailAddress.label?.trim() || undefined,
        email: emailAddress.email.trim(),
        isPrimary: emailAddress.isPrimary ?? index === 0,
        sortOrder: emailAddress.sortOrder ?? index,
      })),
    documents: payload.documents
      .filter((document) => document.documentName.trim())
      .map((document) => ({
        id: document.id,
        documentName: document.documentName.trim(),
        documentType: document.documentType?.trim() || undefined,
        fileUrl: document.fileUrl?.trim() || undefined,
        notes: document.notes?.trim() || undefined,
      })),
  }
}

export async function listAgencies(params: AgencyListParams) {
  return apiRequest<PaginatedCollectionResponse<AgencyListItem>>(
    `/agencies${buildQueryString({
      page: params.page,
      pageSize: params.pageSize,
      search: params.search,
      isActive: params.isActive,
      agencyType: params.agencyType,
      parentAgencyId: params.parentAgencyId,
      category: params.category,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
    })}`,
  )
}

export async function lookupAgencies(params: AgencyLookupParams) {
  const response = await apiRequest<EntityResponse<AgencyLookupItem[]>>(
    `/agencies/lookup${buildQueryString({
      search: params.search,
      agencyType: params.agencyType,
      isActive: params.isActive,
      excludeAgencyId: params.excludeAgencyId,
      limit: params.limit,
    })}`,
  )

  return response.data
}

export async function getAgencyById(id: string, includeBranches = false) {
  const response = await apiRequest<EntityResponse<AgencyDetail>>(
    `/agencies/${id}${buildQueryString({
      includeBranches,
    })}`,
  )

  return response.data
}

async function createAgency(payload: AgencyPayload) {
  const response = await apiRequest<EntityResponse<Agency>>('/agencies', {
    method: 'POST',
    body: normalizeAgencyPayload(payload, 'create'),
  })

  return response.data
}

async function updateAgency(id: string, payload: AgencyPayload) {
  const response = await apiRequest<EntityResponse<Agency>>(`/agencies/${id}`, {
    method: 'PATCH',
    body: normalizeAgencyPayload(payload, 'update'),
  })

  return response.data
}

async function deleteAgency(id: string) {
  await apiRequest<void>(`/agencies/${id}`, {
    method: 'DELETE',
  })
}

export function useAgenciesQuery(params: AgencyListParams) {
  return useQuery({
    queryKey: [...queryKeys.agencies, params],
    queryFn: () => listAgencies(params),
    placeholderData: keepPreviousData,
  })
}

export function useAgencyLookupQuery(params: AgencyLookupParams, enabled = true) {
  return useQuery({
    queryKey: [...queryKeys.agencies, 'lookup', params],
    queryFn: () => lookupAgencies(params),
    enabled,
    placeholderData: keepPreviousData,
  })
}

export function useAgencyDetailsQuery(id?: string, includeBranches = false, enabled = true) {
  return useQuery({
    queryKey: [...queryKeys.agencies, 'details', id, includeBranches],
    queryFn: () => getAgencyById(id ?? '', includeBranches),
    enabled: enabled && Boolean(id),
  })
}

export function useCreateAgencyMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createAgency,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.agencies })
      void queryClient.invalidateQueries({ queryKey: queryKeys.reports })
    },
  })
}

export function useUpdateAgencyMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AgencyPayload }) =>
      updateAgency(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.agencies })
      void queryClient.invalidateQueries({ queryKey: queryKeys.reports })
      void queryClient.invalidateQueries({ queryKey: queryKeys.agencyReports })
      void queryClient.invalidateQueries({ queryKey: queryKeys.agencyLedgers })
      void queryClient.invalidateQueries({ queryKey: queryKeys.outstandingBalanceReports })
    },
  })
}

export function useDeleteAgencyMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteAgency,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.agencies })
      void queryClient.invalidateQueries({ queryKey: queryKeys.reports })
      void queryClient.invalidateQueries({ queryKey: queryKeys.agencyReports })
      void queryClient.invalidateQueries({ queryKey: queryKeys.agencyLedgers })
      void queryClient.invalidateQueries({ queryKey: queryKeys.outstandingBalanceReports })
    },
  })
}
